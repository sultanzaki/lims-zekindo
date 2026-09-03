import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyUsers } from "@/lib/notify";

// This app has no scheduled-job infra at all until this route — everything
// else is purely request-driven. Vercel Cron hits this once a day (see
// vercel.json); it's outside src/proxy.ts's session-cookie matcher (only
// page routes are listed there), so it's guarded by its own secret check
// instead, the same way the mobile API guards itself with a Bearer token.

const OPEN_STATUSES = ["Pending Login", "In Testing", "Awaiting Supervisor Review", "Awaiting QA Approval"];
const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRY_WINDOW_MS = 14 * DAY_MS;
// A daily cron re-running the same checks would otherwise re-notify every
// still-overdue item every single day. Before sending, check whether a
// notification with this exact title already went out inside the window —
// title is a deliberately stable, deterministic key per entity+condition.
const DEDUP_WINDOW_MS = 20 * 60 * 60 * 1000;

// Batches the dedup check into one query per run (per candidate list)
// instead of one round-trip per candidate item — each check function below
// collects all its candidate titles up front, then asks once which of them
// already went out inside the window.
async function alreadyNotifiedTitles(titles: string[]): Promise<Set<string>> {
  if (titles.length === 0) return new Set();
  const since = new Date(Date.now() - DEDUP_WINDOW_MS);
  const existing = await prisma.notification.findMany({
    where: { title: { in: titles }, createdAt: { gte: since } },
    select: { title: true },
  });
  return new Set(existing.map((n) => n.title));
}

async function usersWithRoles(roles: string[]): Promise<string[]> {
  const users = await prisma.user.findMany({ where: { accessRole: { in: roles }, active: true }, select: { id: true } });
  return users.map((u) => u.id);
}

async function checkOverdueTat(): Promise<number> {
  const recipients = await usersWithRoles(["SUPERVISOR", "QA_MANAGER", "ADMIN"]);
  if (recipients.length === 0) return 0;

  const overdue = await prisma.$queryRaw<{ id: string; type: string }[]>`
    SELECT s.id, s.type FROM "Sample" s
    LEFT JOIN "SampleTypeCatalog" c ON s."sampleTypeId" = c.id
    WHERE s.status = ANY(${OPEN_STATUSES})
    AND s."receivedDate" + (COALESCE(c."targetTatHours", 48) || ' hours')::interval < now()
  `;

  const candidates = overdue.map((s) => ({
    title: `Overdue TAT: ${s.id}`,
    body: `${s.type} (${s.id}) is past its target turnaround time and still open.`,
    sampleId: s.id,
  }));
  const notified = await alreadyNotifiedTitles(candidates.map((c) => c.title));

  let sent = 0;
  for (const c of candidates) {
    if (notified.has(c.title)) continue;
    await notifyUsers({ userIds: recipients, title: c.title, body: c.body, sampleId: c.sampleId });
    sent++;
  }
  return sent;
}

async function checkReagents(): Promise<number> {
  const recipients = await usersWithRoles(["ADMIN", "QA_MANAGER"]);
  if (recipients.length === 0) return 0;

  const now = Date.now();
  const reagents = await prisma.reagent.findMany({
    select: { id: true, name: true, lotNumber: true, quantity: true, minStockLevel: true, unit: true, expiryDate: true },
  });

  const candidates: { title: string; body: string }[] = [];
  for (const r of reagents) {
    if (r.expiryDate && r.expiryDate.getTime() < now) {
      candidates.push({
        title: `Reagent expired: ${r.name} (Lot ${r.lotNumber})`,
        body: `${r.name}, lot ${r.lotNumber}, expired on ${r.expiryDate.toDateString()}.`,
      });
    } else if (r.quantity <= r.minStockLevel) {
      candidates.push({
        title: `Reagent low stock: ${r.name} (Lot ${r.lotNumber})`,
        body: `${r.name}, lot ${r.lotNumber}: ${r.quantity} ${r.unit} remaining (min ${r.minStockLevel} ${r.unit}).`,
      });
    } else if (r.expiryDate && r.expiryDate.getTime() - now < EXPIRY_WINDOW_MS) {
      candidates.push({
        title: `Reagent expiring soon: ${r.name} (Lot ${r.lotNumber})`,
        body: `${r.name}, lot ${r.lotNumber}, expires on ${r.expiryDate.toDateString()}.`,
      });
    }
  }
  const notified = await alreadyNotifiedTitles(candidates.map((c) => c.title));

  let sent = 0;
  for (const c of candidates) {
    if (notified.has(c.title)) continue;
    await notifyUsers({ userIds: recipients, title: c.title, body: c.body });
    sent++;
  }
  return sent;
}

async function checkEquipment(): Promise<number> {
  const recipients = await usersWithRoles(["ADMIN", "QA_MANAGER"]);
  if (recipients.length === 0) return 0;

  const now = Date.now();
  const equipment = await prisma.equipment.findMany({
    where: { nextCalibrationDue: { not: null } },
    select: { id: true, name: true, assetTag: true, nextCalibrationDue: true },
  });

  const candidates: { title: string; body: string }[] = [];
  for (const e of equipment) {
    if (!e.nextCalibrationDue) continue;
    const due = e.nextCalibrationDue.getTime();
    if (due < now) {
      candidates.push({
        title: `Calibration overdue: ${e.name} (${e.assetTag})`,
        body: `${e.name} (${e.assetTag}) calibration was due ${e.nextCalibrationDue.toDateString()}.`,
      });
    } else if (due - now < EXPIRY_WINDOW_MS) {
      candidates.push({
        title: `Calibration due soon: ${e.name} (${e.assetTag})`,
        body: `${e.name} (${e.assetTag}) calibration is due ${e.nextCalibrationDue.toDateString()}.`,
      });
    }
  }
  const notified = await alreadyNotifiedTitles(candidates.map((c) => c.title));

  let sent = 0;
  for (const c of candidates) {
    if (notified.has(c.title)) continue;
    await notifyUsers({ userIds: recipients, title: c.title, body: c.body });
    sent++;
  }
  return sent;
}

// Notify-only, deliberately — a human still has to click the existing
// "mark disposed" action. Auto-purging regulated lab records on a timer
// with no sign-off is the wrong default.
async function checkRetention(): Promise<number> {
  const recipients = await usersWithRoles(["ADMIN"]);
  if (recipients.length === 0) return 0;

  const overdue = await prisma.sample.findMany({
    where: { status: "Complete", disposedAt: null, retentionUntil: { lt: new Date() } },
    select: { id: true, type: true, retentionUntil: true },
  });

  const candidates = overdue.map((s) => ({
    title: `Retention passed: ${s.id}`,
    body: `${s.type} (${s.id}) passed its retention date on ${s.retentionUntil?.toDateString()} and hasn't been marked disposed.`,
    sampleId: s.id,
  }));
  const notified = await alreadyNotifiedTitles(candidates.map((c) => c.title));

  let sent = 0;
  for (const c of candidates) {
    if (notified.has(c.title)) continue;
    await notifyUsers({ userIds: recipients, title: c.title, body: c.body, sampleId: c.sampleId });
    sent++;
  }
  return sent;
}

// Overdue deviations notify their assignee — falling back to Supervisors
// when nobody's been assigned yet, so an unassigned overdue deviation
// doesn't just silently go unnoticed.
async function checkOverdueDeviations(): Promise<number> {
  const fallbackRecipients = await usersWithRoles(["SUPERVISOR"]);

  const overdue = await prisma.deviation.findMany({
    where: { status: { not: "Closed" }, dueDate: { lt: new Date() } },
    select: { id: true, sampleId: true, assigneeId: true, dueDate: true },
  });

  const candidates = overdue.map((d) => ({
    title: `Deviation overdue: ${d.sampleId}`,
    body: `The deviation opened on sample ${d.sampleId} was due ${d.dueDate?.toDateString()} and is still open.`,
    sampleId: d.sampleId,
    recipients: d.assigneeId ? [d.assigneeId] : fallbackRecipients,
  }));
  const notified = await alreadyNotifiedTitles(candidates.map((c) => c.title));

  let sent = 0;
  for (const c of candidates) {
    if (c.recipients.length === 0 || notified.has(c.title)) continue;
    await notifyUsers({ userIds: c.recipients, title: c.title, body: c.body, sampleId: c.sampleId });
    sent++;
  }
  return sent;
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;
  const queryParam = new URL(req.url).searchParams.get("secret");
  return queryParam === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [overdueTat, reagents, equipment, retention, deviations] = await Promise.all([
    checkOverdueTat(),
    checkReagents(),
    checkEquipment(),
    checkRetention(),
    checkOverdueDeviations(),
  ]);

  return NextResponse.json({ ok: true, sent: { overdueTat, reagents, equipment, retention, deviations } });
}
