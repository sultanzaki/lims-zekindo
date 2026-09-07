import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getNextSampleId } from "@/lib/data";
import { parseJakartaLocalDateTime } from "@/lib/tz";
import { generateAccessCode } from "@/lib/tracking";
import { submitTestResultCore } from "@/lib/sample-actions-core";
import type { User } from "@prisma/client";

export type AssistantActionResult = { ok: true; message: string; sampleId?: string } | { ok: false; error: string };

// The AI assistant's create_sample tool calls this directly (server-side,
// no FormData, no redirect — the assistant returns {ok,message} which the
// confirm route sends back to the widget). Business rules are identical to
// the manual New Sample form: same duplicate guard, same sample-type
// default tests, same custody trail, same audit entry. Sample type is
// resolved by NAME (the assistant resolves it via find_sample_type first),
// never by a guessed id.
export async function createSampleForAssistant(
  actingUser: User,
  input: {
    name: string;
    sampleTypeName: string;
    source?: string;
    requestorName?: string;
    businessUnitName?: string;
    collectedBy?: string;
    collectedDate?: string;
    storageLocation?: string;
    priority?: string;
  }
): Promise<AssistantActionResult> {
  const name = (input.name || "").trim();
  const sampleTypeName = (input.sampleTypeName || "").trim();
  if (!name) return { ok: false, error: "Sample name is required." };
  if (!sampleTypeName) return { ok: false, error: "Sample type is required — search it first with find_sample_type." };

  const sampleType = await prisma.sampleTypeCatalog.findFirst({
    where: { name: { equals: sampleTypeName, mode: "insensitive" }, active: true },
    include: { tests: { where: { active: true }, orderBy: { order: "asc" } } },
  });
  if (!sampleType) {
    return { ok: false, error: `Sample type "${sampleTypeName}" not found. Search with find_sample_type first.` };
  }

  const priority = ["Routine", "Urgent", "STAT"].includes(input.priority ?? "") ? (input.priority as string) : "Routine";

  // Same duplicate guard as the manual form: block an exact name+requestor
  // repeat within the last 24h.
  const duplicateWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const exactDup = await prisma.sample.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      requestorName: input.requestorName ? { equals: input.requestorName.trim(), mode: "insensitive" } : undefined,
      receivedDate: { gte: duplicateWindowStart },
    },
    select: { id: true },
  });
  if (exactDup) {
    return {
      ok: false,
      error: `A sample named "${name}" for this requestor was already logged in the last 24h (${exactDup.id}). If this is a different sample, include the batch/sublot in the name to distinguish it.`,
    };
  }

  const businessUnit = input.businessUnitName
    ? await prisma.businessUnit.findFirst({ where: { name: { equals: input.businessUnitName.trim(), mode: "insensitive" }, active: true }, select: { id: true } })
    : null;

  const now = new Date();
  const collectedDate = input.collectedDate ? parseJakartaLocalDateTime(input.collectedDate) : now;
  const id = await getNextSampleId();
  const retentionUntil = new Date(now.getTime() + sampleType.retentionDays * 24 * 60 * 60 * 1000);

  const testsToCreate =
    sampleType.tests.length > 0
      ? sampleType.tests.map((t, i) => ({
          name: t.name,
          status: "pending" as const,
          unit: t.unit,
          spec: t.spec,
          order: i,
          resultMode: t.resultMode,
          replicateCount: t.replicateCount,
          intervalPlan: t.intervalPlan,
          resultType: t.resultType,
          numericMode: t.numericMode,
          numericLimit: t.numericLimit,
          numericMin: t.numericMin,
          numericMax: t.numericMax,
          numericTarget: t.numericTarget,
          numericTolerance: t.numericTolerance,
          categoricalOptions: t.categoricalOptions,
          categoricalPassOptions: t.categoricalPassOptions,
          categoricalOrdered: t.categoricalOrdered,
          requiresAttachment: t.requiresAttachment,
        }))
      : [{ name: `${sampleType.name} — Screening`, status: "pending" as const, unit: "", spec: "Per SOP", order: 0, resultMode: "SINGLE", replicateCount: null, intervalPlan: null }];

  await prisma.sample.create({
    data: {
      id,
      name,
      priority,
      type: sampleType.name,
      sampleTypeId: sampleType.id,
      source: (input.source || "—").trim(),
      status: "Pending Login",
      accessCode: generateAccessCode(),
      requestorName: input.requestorName?.trim() || null,
      businessUnitId: businessUnit?.id ?? null,
      collectedBy: input.collectedBy?.trim() || actingUser.name,
      collectedDate,
      receivedDate: now,
      container: "Sterile bag",
      storageLocation: input.storageLocation?.trim() || null,
      retentionUntil,
      tests: { create: testsToCreate },
      custodyEvents: {
        create: [
          { label: "Collected", time: collectedDate, order: 0 },
          { label: "Received at Lab", time: now, order: 1 },
          { label: "Logged In", time: now, order: 2 },
        ],
      },
    },
  });

  await logAudit({ userId: actingUser.id, action: "sample.created", entityType: "Sample", entityId: id, detail: name });

  return {
    ok: true,
    sampleId: id,
    message: `Sample ${id} (${name}) logged in as "${sampleType.name}" — ${sampleType.tests.length > 0 ? `${sampleType.tests.length} test(s) auto-assigned, ` : ""}status Pending Login.`,
  };
}

// Submit a result for one test on a sample. Resolves the test by sample ID +
// test NAME (never a guessed test id). Enforces the same rules as the manual
// form (test must be pending, belongs to the sample, etc.).
export async function submitTestResultForAssistant(
  actingUser: User,
  input: { sampleId: string; testName: string; result: string; notes?: string }
): Promise<AssistantActionResult> {
  const sampleId = (input.sampleId || "").trim();
  const testName = (input.testName || "").trim();
  const result = (input.result || "").trim();
  if (!sampleId || !testName || !result) {
    return { ok: false, error: "sampleId, testName, and result are all required." };
  }

  const sample = await prisma.sample.findUnique({ where: { id: sampleId }, include: { tests: true } });
  if (!sample) return { ok: false, error: `Sample ${sampleId} not found.` };
  const test = sample.tests.find((t) => t.name.toLowerCase() === testName.toLowerCase());
  if (!test) {
    const available = sample.tests.map((t) => t.name).join(", ");
    return { ok: false, error: `Test "${testName}" not found on ${sampleId}. Available tests: ${available || "(none)"}.` };
  }
  if (test.status !== "pending") {
    return { ok: false, error: `Test "${test.name}" has already been submitted (status: ${test.status}).` };
  }

  const outcome = await submitTestResultCore(actingUser, sampleId, test.id, result, input.notes?.trim() || "");
  if (!outcome.ok) return { ok: false, error: outcome.error };

  return { ok: true, message: `Result for "${test.name}" on ${sampleId} submitted for review (${result}${test.unit ? ` ${test.unit}` : ""}).` };
}

// Open a deviation (OOS/CAPA record) against a sample. Anyone who can view
// the sample can flag an observation; supervisors+ typically own these.
// Mirrors the internal rejection deviation but is a standalone manual open.
export async function openDeviationForAssistant(
  actingUser: User,
  input: { sampleId: string; description: string; severity?: string; assigneeName?: string }
): Promise<AssistantActionResult> {
  const sampleId = (input.sampleId || "").trim();
  const description = (input.description || "").trim();
  if (!sampleId) return { ok: false, error: "sampleId is required." };
  if (!description) return { ok: false, error: "Describe what deviated / what the observation is." };

  const sample = await prisma.sample.findUnique({ where: { id: sampleId }, select: { id: true, type: true } });
  if (!sample) return { ok: false, error: `Sample ${sampleId} not found.` };

  const severity = ["Low", "Medium", "High", "Critical"].includes(input.severity ?? "")
    ? (input.severity as string)
    : null;

  let assigneeId: string | null = null;
  if (input.assigneeName) {
    const assignee = await prisma.user.findFirst({
      where: { name: { equals: input.assigneeName.trim(), mode: "insensitive" }, active: true },
      select: { id: true },
    });
    if (!assignee) return { ok: false, error: `Assignee "${input.assigneeName}" not found. Search with list_users first.` };
    assigneeId = assignee.id;
  }

  const deviation = await prisma.deviation.create({
    data: {
      sampleId,
      description,
      status: "Open",
      openedBy: actingUser.id,
      severity,
      assigneeId,
    },
  });

  await logAudit({
    userId: actingUser.id,
    action: "deviation.opened",
    entityType: "Deviation",
    entityId: deviation.id,
    detail: `${sampleId}: ${description}`,
  });

  return { ok: true, message: `Deviation opened on ${sampleId} (${deviation.id}). ${severity ? `Severity: ${severity}. ` : ""}${assigneeId ? "Assigned for follow-up." : "Unassigned — assign someone to own it."}` };
}
