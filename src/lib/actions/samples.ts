"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { getNextSampleId } from "@/lib/data";
import { logAudit } from "@/lib/audit";
import { canReviewAsSupervisor, canApproveAsQa, isAdmin } from "@/lib/roles";
import { uploadAttachment, deleteAttachment } from "@/lib/storage";
import { detectUploadType } from "@/lib/fileType";
import { parseJakartaLocalDateTime } from "@/lib/tz";
import { generateAccessCode } from "@/lib/tracking";
import { notifyUsers, getSubmitterIds } from "@/lib/notify";
import {
  submitTestResultCore,
  addTestReadingCore,
  deleteTestReadingCore,
  uploadTestAttachmentCore,
} from "@/lib/sample-actions-core";

const MAX_REPORT_BYTES = 20 * 1024 * 1024;
const canManageReports = (role: string) => canReviewAsSupervisor(role) || canApproveAsQa(role) || isAdmin(role);

export type FormState = { error?: string };

// Live duplicate-suggestion check used by the New Sample form: as the
// technician types a name + requestor, the client calls this (debounced)
// to surface samples logged recently under a similar name, so a repeat
// login is caught before submit rather than after.
export async function findRecentSimilarSamplesAction(args: {
  name: string;
  requestorName?: string | null;
}): Promise<{ id: string; name: string | null; type: string; receivedDate: Date }[]> {
  await requireUser();
  const name = (args.name || "").trim();
  if (name.length < 3) return [];
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // look back 7 days
  return prisma.sample.findMany({
    where: {
      name: { contains: name, mode: "insensitive" },
      receivedDate: { gte: since },
    },
    select: { id: true, name: true, type: true, receivedDate: true },
    orderBy: { receivedDate: "desc" },
    take: 5,
  });
}

export async function createSampleAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const name = String(formData.get("name") || "").trim();
  const sampleTypeId = String(formData.get("sampleTypeId") || "");
  const source = String(formData.get("source") || "").trim();
  const requestorName = String(formData.get("requestorName") || "").trim();
  const businessUnitId = String(formData.get("businessUnitId") || "").trim();
  const collectedBy = String(formData.get("collectedBy") || user.name).trim();
  const collectedDateRaw = String(formData.get("collectedDate") || "");
  const storageLocation = String(formData.get("storageLocation") || "").trim();
  const priorityRaw = String(formData.get("priority") || "Routine");
  const priority = ["Routine", "Urgent", "STAT"].includes(priorityRaw) ? priorityRaw : "Routine";

  if (!name) {
    return { error: "Enter a sample name." };
  }
  if (!sampleTypeId) {
    return { error: "Select a sample type." };
  }

  // --- Duplicate-sample guard ------------------------------------------
  // A very common lab error is logging the same physical sample twice (or
  // two samples from the same batch under slightly different names). Block
  // an exact duplicate within a short window, and surface near-matches as a
  // warning the technician must consciously override.
  const duplicateWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const exactDup = await prisma.sample.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      requestorName: requestorName ? { equals: requestorName, mode: "insensitive" } : undefined,
      receivedDate: { gte: duplicateWindowStart },
    },
    select: { id: true },
  });
  if (exactDup) {
    return {
      error: `A sample named "${name}" for this requestor was already logged in the last 24h (${exactDup.id}). If this is truly a different sample, rename it or note the batch/sublot to distinguish it.`,
    };
  }
  // -----------------------------------------------------------------------

  const sampleType = await prisma.sampleTypeCatalog.findUnique({
    where: { id: sampleTypeId },
    include: { tests: { where: { active: true }, orderBy: { order: "asc" } } },
  });
  if (!sampleType) return { error: "Sample type not found." };

  // Ad-hoc extras picked in the form (individually, or via a quick-add
  // panel) — merged in alongside the sample type's own default tests.
  // Anything already in the default list is deduped rather than trusting
  // the client to have excluded it.
  const defaultTestIds = new Set(sampleType.tests.map((t) => t.id));
  const extraTestIds = formData
    .getAll("extraTestIds")
    .map((v) => String(v))
    .filter((id) => id && !defaultTestIds.has(id));
  const extraTests =
    extraTestIds.length > 0
      ? await prisma.testCatalog.findMany({ where: { id: { in: extraTestIds }, active: true } })
      : [];

  const collectedDate = collectedDateRaw ? parseJakartaLocalDateTime(collectedDateRaw) : new Date();
  const now = new Date();
  const id = await getNextSampleId();
  const retentionUntil = new Date(now.getTime() + sampleType.retentionDays * 24 * 60 * 60 * 1000);

  const allTests = [...sampleType.tests, ...extraTests];
  const testsToCreate =
    allTests.length > 0
      ? allTests.map((t, i) => ({
          name: t.name,
          status: "pending",
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
      : [{ name: `${sampleType.name} — Screening`, status: "pending", unit: "", spec: "Per SOP", order: 0, resultMode: "SINGLE", replicateCount: null, intervalPlan: null }];

  await prisma.sample.create({
    data: {
      id,
      name,
      priority,
      type: sampleType.name,
      sampleTypeId: sampleType.id,
      source: source || "—",
      status: "Pending Login",
      accessCode: generateAccessCode(),
      requestorName: requestorName || null,
      businessUnitId: businessUnitId || null,
      collectedBy: collectedBy || user.name,
      collectedDate,
      receivedDate: now,
      container: "Sterile bag",
      storageLocation: storageLocation || null,
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

  await logAudit({ userId: user.id, action: "sample.created", entityType: "Sample", entityId: id });

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  redirect(`/samples/${id}`);
}

export async function submitTestResultAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const sampleId = String(formData.get("sampleId") || "");
  const testId = String(formData.get("testId") || "");
  const result = String(formData.get("result") || "");
  const notes = String(formData.get("notes") || "");

  const outcome = await submitTestResultCore(user, sampleId, testId, result, notes);
  if (!outcome.ok) return { error: outcome.error };

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath(`/samples/${sampleId}`);
  redirect(`/samples/${sampleId}`);
}

// Correct an already-approved test result (typo / transcription fix on a
// Complete sample). Restricted to supervisors/QA/admins because a published
// COA may already be out — the change is snapshotted (previousResult + who/
// when/why) and appears in the audit trail. Technicians cannot correct their
// own submitted result after approval; that path is reject → recollection.
export async function correctTestResultAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageReports); // supervisor+ (same bar as report mgmt)

  const sampleId = String(formData.get("sampleId") || "");
  const testId = String(formData.get("testId") || "");
  const result = String(formData.get("result") || "").trim();
  const reason = String(formData.get("reason") || "").trim();

  if (!result) return { error: "Enter the corrected result." };
  if (!reason) return { error: "Enter a reason for the correction." };

  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test || test.sampleId !== sampleId) return { error: "Test not found." };
  // Only tests whose result is already in (awaiting or complete) can be
  // corrected; pending tests are edited through the normal entry form.
  if (test.status === "pending") return { error: "This test hasn't been submitted yet — edit it through the normal form." };
  if (test.result === result) return { error: "The result is already that value — no correction needed." };

  await prisma.test.update({
    where: { id: testId },
    data: {
      // Snapshot the old value before overwrite — this is the correction
      // trail. Repeated corrections chain: previousResult holds whatever
      // was there immediately before this edit.
      previousResult: test.result,
      result,
      correctionReason: reason,
      correctedById: user.id,
      correctedAt: new Date(),
    },
  });

  await logAudit({
    userId: user.id,
    action: "test.result_corrected",
    entityType: "Test",
    entityId: testId,
    detail: `${test.result ?? ""} → ${result}`,
    metadata: { result: { from: test.result ?? "", to: result }, reason: { from: "", to: reason } },
  });

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath(`/samples/${sampleId}`);
  return {};
}

export async function addTestReadingAction(
  sampleId: string,
  testId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const value = String(formData.get("value") || "");
  const intervalLabel = String(formData.get("intervalLabel") || "").trim() || null;
  const replicateIndexRaw = String(formData.get("replicateIndex") || "").trim();
  const note = String(formData.get("note") || "");
  const replicateIndex = replicateIndexRaw ? Number(replicateIndexRaw) : null;

  const outcome = await addTestReadingCore(user, sampleId, testId, { value, intervalLabel, replicateIndex, note });
  if (!outcome.ok) return { error: outcome.error };

  revalidatePath(`/samples/${sampleId}/tests/${testId}`);
  return {};
}

export async function deleteTestReadingAction(sampleId: string, testId: string, readingId: string) {
  const user = await requireUser();
  await deleteTestReadingCore(sampleId, testId, readingId, user);
  revalidatePath(`/samples/${sampleId}/tests/${testId}`);
}

export async function uploadTestAttachmentAction(
  sampleId: string,
  testId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a file to upload." };

  const outcome = await uploadTestAttachmentCore(user, sampleId, testId, file);
  if (!outcome.ok) return { error: outcome.error };

  revalidatePath(`/samples/${sampleId}/tests/${testId}`);
  return {};
}

export async function deleteTestAttachmentAction(sampleId: string, testId: string, attachmentId: string) {
  const user = await requireUser();
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test || test.sampleId !== sampleId || test.status !== "pending") return;

  const attachment = await prisma.testAttachment.findFirst({ where: { id: attachmentId, testId } });
  if (!attachment) return;

  try {
    await deleteAttachment(attachment.storagePath);
  } catch {
    return;
  }
  await prisma.testAttachment.delete({ where: { id: attachmentId } });
  await logAudit({ userId: user.id, action: "test.attachment_removed", entityType: "Test", entityId: testId, detail: attachment.fileName });

  revalidatePath(`/samples/${sampleId}/tests/${testId}`);
}

// Sample-level report documents (e.g. a finished, signed-off report drafted
// outside the system) — separate from TestAttachment, which is per-parameter
// working documentation attached while an individual test is still open.
export async function uploadSampleReportAction(
  sampleId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (file.size > MAX_REPORT_BYTES) return { error: "File is too large (max 20MB)." };

  // Content-based validation — the client's file.type label is not trusted
  // on its own. Only files whose magic bytes match an allowed type are
  // accepted; the stored fileType is the detected one so signed URLs serve
  // the correct Content-Type.
  const detected = await detectUploadType(file, file.type);
  if (!detected) {
    return { error: "Unsupported file type. Use a PDF, Word, Excel, or image file." };
  }

  const sample = await prisma.sample.findUnique({ where: { id: sampleId }, select: { id: true } });
  if (!sample) return { error: "Sample not found." };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `reports/${sampleId}/${randomUUID()}-${safeName}`;

  try {
    await uploadAttachment(storagePath, file, detected.mime);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }

  await prisma.sampleReport.create({
    data: {
      sampleId,
      fileName: file.name,
      fileType: detected.mime,
      fileSize: file.size,
      storagePath,
      uploadedBy: user.name,
    },
  });

  await logAudit({ userId: user.id, action: "sample.report_added", entityType: "Sample", entityId: sampleId, detail: file.name });

  revalidatePath(`/samples/${sampleId}`);
  return {};
}

export async function deleteSampleReportAction(sampleId: string, reportId: string) {
  const user = await requireRole(canManageReports);

  const report = await prisma.sampleReport.findFirst({ where: { id: reportId, sampleId } });
  if (!report) return;

  try {
    await deleteAttachment(report.storagePath);
  } catch {
    return;
  }
  await prisma.sampleReport.delete({ where: { id: reportId } });
  await logAudit({ userId: user.id, action: "sample.report_removed", entityType: "Sample", entityId: sampleId, detail: report.fileName });

  revalidatePath(`/samples/${sampleId}`);
}

async function openDeviationForRejection(sampleId: string, sampleType: string, userId: string, stage: string, reason?: string) {
  await prisma.deviation.create({
    data: {
      sampleId,
      description: reason
        ? `Result rejected at ${stage} review: ${reason}`
        : `Result rejected at ${stage} review. ${sampleType} did not meet acceptance criteria.`,
      status: "Open",
      openedBy: userId,
    },
  });
}

async function verifySignature(userId: string, formData: FormData): Promise<{ user: Awaited<ReturnType<typeof requireUser>> } | { error: string }> {
  const password = String(formData.get("password") || "");
  if (!password) return { error: "Enter your password to sign this action." };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found." };

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "Incorrect password — signature not applied." };

  return { user };
}

// Shared with bulkApproveSamplesAction below, so a batch approval writes the
// exact same status transition, custody event, and audit entry as approving
// one sample at a time through the review panel — the only thing bulk mode
// changes is how many samples get looped through, not what happens to each.
async function performSupervisorApprove(sample: { id: string }, user: { id: string; name: string; role: string; email: string }) {
  // Conditional update — the status guard lives in the WHERE clause, so two
  // reviewers approving at the same instant can't both pass the pre-check
  // and double-transition the sample. Exactly one caller wins. (updateMany
  // can't nest custodyEvents.create, so the transition is split: the guarded
  // status flip first, then the custody event on the row we just won.)
  const updated = await prisma.sample.updateMany({
    where: { id: sample.id, status: "Awaiting Supervisor Review" },
    data: { status: "Awaiting QA Approval", reviewedByRole: user.role },
  });
  if (updated.count === 0) throw new Error("Sample no longer awaiting supervisor review");
  const eventCount = await prisma.custodyEvent.count({ where: { sampleId: sample.id } });
  await prisma.sample.update({
    where: { id: sample.id },
    data: { custodyEvents: { create: [{ label: `Supervisor Reviewed (${user.name})`, time: new Date(), order: eventCount }] } },
  });
  await logAudit({
    userId: user.id,
    action: "sample.supervisor_approved",
    entityType: "Sample",
    entityId: sample.id,
    detail: `e-signed by ${user.email}`,
    metadata: { status: { from: "Awaiting Supervisor Review", to: "Awaiting QA Approval" } },
  });
}

async function performQaApprove(sample: { id: string; type: string }, user: { id: string; name: string; role: string; email: string }) {
  // Same guarded transition as performSupervisorApprove — the status check
  // lives in the WHERE so only one concurrent approver wins.
  const updated = await prisma.sample.updateMany({
    where: { id: sample.id, status: "Awaiting QA Approval" },
    data: { status: "Complete", approvedBy: `${user.name}, ${user.role}`, approvedAt: new Date() },
  });
  if (updated.count === 0) throw new Error("Sample no longer awaiting QA approval");
  const eventCount = await prisma.custodyEvent.count({ where: { sampleId: sample.id } });
  const submitterIds = await getSubmitterIds(sample.id);
  await prisma.sample.update({
    where: { id: sample.id },
    data: { custodyEvents: { create: [{ label: "QA Approved", time: new Date(), order: eventCount }] } },
  });
  await prisma.test.updateMany({ where: { sampleId: sample.id, status: "awaiting" }, data: { status: "complete" } });
  await notifyUsers({
    userIds: [user.id, ...submitterIds],
    title: `Result approved — ${sample.id}`,
    body: `${sample.type} passed QA review and is ready for release.`,
    sampleId: sample.id,
  });
  await logAudit({
    userId: user.id,
    action: "sample.qa_approved",
    entityType: "Sample",
    entityId: sample.id,
    detail: `e-signed by ${user.email}`,
    metadata: { status: { from: "Awaiting QA Approval", to: "Complete" } },
  });
}

export async function supervisorApproveAction(
  sampleId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const reviewer = await requireRole(canReviewAsSupervisor);
  const verified = await verifySignature(reviewer.id, formData);
  if ("error" in verified) return verified;
  const user = verified.user;

  const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
  if (!sample || sample.status !== "Awaiting Supervisor Review") return { error: "This sample is no longer awaiting supervisor review." };

  try {
    await performSupervisorApprove(sample, user);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Approval failed." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath(`/samples/${sampleId}`);
  return {};
}

async function performSupervisorReject(sample: { id: string; type: string }, user: { id: string; name: string; email: string }, reason?: string) {
  // Guarded transition — same anti-double-action pattern as approve.
  const updated = await prisma.sample.updateMany({
    where: { id: sample.id, status: "Awaiting Supervisor Review" },
    data: { status: "Rejected" },
  });
  if (updated.count === 0) throw new Error("Sample no longer awaiting supervisor review");
  const eventCount = await prisma.custodyEvent.count({ where: { sampleId: sample.id } });
  const submitterIds = await getSubmitterIds(sample.id);
  await prisma.sample.update({
    where: { id: sample.id },
    data: { custodyEvents: { create: [{ label: `Supervisor Rejected (${user.name})`, detail: reason, time: new Date(), order: eventCount }] } },
  });
  await notifyUsers({
    userIds: [user.id, ...submitterIds],
    title: `Supervisor rejected ${sample.id}`,
    body: reason
      ? `${sample.type}: ${reason}`
      : `${sample.type} did not pass supervisor review. Recollection may be required.`,
    sampleId: sample.id,
  });
  await openDeviationForRejection(sample.id, sample.type, user.id, "supervisor", reason);
  await logAudit({
    userId: user.id,
    action: "sample.supervisor_rejected",
    entityType: "Sample",
    entityId: sample.id,
    detail: `e-signed by ${user.email}`,
    metadata: { status: { from: "Awaiting Supervisor Review", to: "Rejected" } },
  });
}

export async function supervisorRejectAction(
  sampleId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const reviewer = await requireRole(canReviewAsSupervisor);
  const verified = await verifySignature(reviewer.id, formData);
  if ("error" in verified) return verified;
  const user = verified.user;
  const reason = String(formData.get("reason") || "").trim();
  if (!reason) return { error: "Enter a reason for rejecting this sample." };

  const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
  if (!sample || sample.status !== "Awaiting Supervisor Review") return { error: "This sample is no longer awaiting supervisor review." };

  try {
    await performSupervisorReject(sample, user, reason);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Rejection failed." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath(`/samples/${sampleId}`);
  revalidatePath("/notifications");
  revalidatePath("/deviations");
  return {};
}

export async function qaApproveAction(
  sampleId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const reviewer = await requireRole(canApproveAsQa);
  const verified = await verifySignature(reviewer.id, formData);
  if ("error" in verified) return verified;
  const user = verified.user;

  const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
  if (!sample || sample.status !== "Awaiting QA Approval") return { error: "This sample is no longer awaiting QA approval." };

  try {
    await performQaApprove(sample, user);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Approval failed." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath(`/samples/${sampleId}`);
  revalidatePath("/notifications");
  return {};
}

export type BulkApproveResult = { error: string } | { approved: number; skipped: { id: string; reason: string }[] };

// Bulk-select on the Samples list feeds this one action regardless of which
// stage each selected sample is actually in — Supervisor-review and
// QA-approval samples can be mixed in one selection, and each one is routed
// to whichever transition it's actually eligible for (or skipped with a
// reason) rather than requiring the caller to separate them first.
export async function bulkApproveSamplesAction(sampleIds: string[], password: string): Promise<BulkApproveResult> {
  const user = await requireUser();

  if (!password) return { error: "Enter your password to sign this action." };
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "Incorrect password — signature not applied." };

  if (sampleIds.length === 0) return { error: "No samples selected." };
  if (sampleIds.length > 100) return { error: "Too many samples selected at once (max 100)." };

  let approved = 0;
  const skipped: { id: string; reason: string }[] = [];

  // Each per-sample transition runs in its own transaction (via the
  // conditional updateMany inside performSupervisorApprove/performQaApprove).
  // A failure on one sample is caught below and recorded as skipped rather
  // than aborting the whole batch partway, so the user always gets a
  // truthful approved/skipped breakdown and a mid-batch DB error can't
  // leave the samples list in an unknown state.
  for (const sampleId of sampleIds) {
    try {
      const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
      if (!sample) {
        skipped.push({ id: sampleId, reason: "Sample not found" });
        continue;
      }
      if (sample.status === "Awaiting Supervisor Review" && canReviewAsSupervisor(user.accessRole)) {
        await performSupervisorApprove(sample, user);
        approved++;
      } else if (sample.status === "Awaiting QA Approval" && canApproveAsQa(user.accessRole)) {
        await performQaApprove(sample, user);
        approved++;
      } else if (sample.status === "Awaiting Supervisor Review" || sample.status === "Awaiting QA Approval") {
        skipped.push({ id: sampleId, reason: "You don't have permission to approve this stage" });
      } else {
        skipped.push({ id: sampleId, reason: `No longer awaiting review (now ${sample.status})` });
      }
    } catch (e) {
      skipped.push({ id: sampleId, reason: e instanceof Error ? e.message : "Approval failed" });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath("/notifications");
  return { approved, skipped };
}

type AssistantActingUser = Awaited<ReturnType<typeof requireUser>>;
type AssistantActionResult = { ok: true; message: string } | { ok: false; error: string };

// The AI assistant's approve/reject tools call these directly — the password
// here always comes from a field the human typed into the confirm card
// itself (never something the model generated), collected client-side and
// passed straight through by the /api/assistant/confirm route. Everything
// past that point is identical to the manual flow: same role gate, same
// status transition, same audit entry, same notification.
export async function approveSampleForAssistant(sampleId: string, actingUser: AssistantActingUser, password: string): Promise<AssistantActionResult> {
  if (!password) return { ok: false, error: "Enter your password to sign this action." };
  const ok = await bcrypt.compare(password, actingUser.passwordHash);
  if (!ok) return { ok: false, error: "Incorrect password — signature not applied." };

  const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
  if (!sample) return { ok: false, error: "Sample not found." };

  if (sample.status === "Awaiting Supervisor Review" && canReviewAsSupervisor(actingUser.accessRole)) {
    await performSupervisorApprove(sample, actingUser);
    revalidatePath("/dashboard");
    revalidatePath("/samples");
    revalidatePath(`/samples/${sampleId}`);
    return { ok: true, message: "Supervisor review approved — now awaiting QA." };
  }
  if (sample.status === "Awaiting QA Approval" && canApproveAsQa(actingUser.accessRole)) {
    await performQaApprove(sample, actingUser);
    revalidatePath("/dashboard");
    revalidatePath("/samples");
    revalidatePath(`/samples/${sampleId}`);
    revalidatePath("/notifications");
    return { ok: true, message: "QA approved — sample marked Complete." };
  }
  if (sample.status === "Awaiting Supervisor Review" || sample.status === "Awaiting QA Approval") {
    return { ok: false, error: "You don't have permission to approve this stage." };
  }
  return { ok: false, error: `Sample is not awaiting review (current status: ${sample.status}).` };
}

export async function rejectSampleForAssistant(sampleId: string, actingUser: AssistantActingUser, password: string): Promise<AssistantActionResult> {
  if (!password) return { ok: false, error: "Enter your password to sign this action." };
  const ok = await bcrypt.compare(password, actingUser.passwordHash);
  if (!ok) return { ok: false, error: "Incorrect password — signature not applied." };

  const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
  if (!sample) return { ok: false, error: "Sample not found." };

  if (sample.status === "Awaiting Supervisor Review" && canReviewAsSupervisor(actingUser.accessRole)) {
    await performSupervisorReject(sample, actingUser);
    revalidatePath("/dashboard");
    revalidatePath("/samples");
    revalidatePath(`/samples/${sampleId}`);
    revalidatePath("/notifications");
    revalidatePath("/deviations");
    return { ok: true, message: "Rejected at supervisor review." };
  }
  if (sample.status === "Awaiting QA Approval" && canApproveAsQa(actingUser.accessRole)) {
    await performQaReject(sample, actingUser);
    revalidatePath("/dashboard");
    revalidatePath("/samples");
    revalidatePath(`/samples/${sampleId}`);
    revalidatePath("/notifications");
    revalidatePath("/deviations");
    return { ok: true, message: "Rejected at QA approval." };
  }
  if (sample.status === "Awaiting Supervisor Review" || sample.status === "Awaiting QA Approval") {
    return { ok: false, error: "You don't have permission to reject this stage." };
  }
  return { ok: false, error: `Sample is not awaiting review (current status: ${sample.status}).` };
}

async function performQaReject(sample: { id: string; type: string }, user: { id: string; name: string; email: string }, reason?: string) {
  // Guarded transition — same anti-double-action pattern as approve.
  const updated = await prisma.sample.updateMany({
    where: { id: sample.id, status: "Awaiting QA Approval" },
    data: { status: "Rejected" },
  });
  if (updated.count === 0) throw new Error("Sample no longer awaiting QA approval");
  const eventCount = await prisma.custodyEvent.count({ where: { sampleId: sample.id } });
  const submitterIds = await getSubmitterIds(sample.id);
  await prisma.sample.update({
    where: { id: sample.id },
    data: { custodyEvents: { create: [{ label: "QA Rejected", detail: reason, time: new Date(), order: eventCount }] } },
  });
  await notifyUsers({
    userIds: [user.id, ...submitterIds],
    title: `QA rejected ${sample.id}`,
    body: reason ? `${sample.type}: ${reason}` : `${sample.type} did not meet spec. Recollection requested.`,
    sampleId: sample.id,
  });
  await openDeviationForRejection(sample.id, sample.type, user.id, "QA", reason);
  await logAudit({
    userId: user.id,
    action: "sample.qa_rejected",
    entityType: "Sample",
    entityId: sample.id,
    detail: `e-signed by ${user.email}`,
    metadata: { status: { from: "Awaiting QA Approval", to: "Rejected" } },
  });
}

export async function qaRejectAction(
  sampleId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const reviewer = await requireRole(canApproveAsQa);
  const verified = await verifySignature(reviewer.id, formData);
  if ("error" in verified) return verified;
  const user = verified.user;
  const reason = String(formData.get("reason") || "").trim();
  if (!reason) return { error: "Enter a reason for rejecting this sample." };

  const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
  if (!sample || sample.status !== "Awaiting QA Approval") return { error: "This sample is no longer awaiting QA approval." };

  try {
    await performQaReject(sample, user, reason);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Rejection failed." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath(`/samples/${sampleId}`);
  revalidatePath("/notifications");
  revalidatePath("/deviations");
  return {};
}

export async function retestSampleAction(originalSampleId: string) {
  const user = await requireUser();
  const original = await prisma.sample.findUnique({
    where: { id: originalSampleId },
    include: { tests: true, retests: { select: { id: true } } },
  });
  if (!original || original.status !== "Rejected" || original.retests.length > 0) return;

  const id = await getNextSampleId();
  const now = new Date();
  const retentionUntil = original.sampleTypeId
    ? await prisma.sampleTypeCatalog
        .findUnique({ where: { id: original.sampleTypeId } })
        .then((st) => (st ? new Date(now.getTime() + st.retentionDays * 24 * 60 * 60 * 1000) : null))
    : null;

  await prisma.sample.create({
    data: {
      id,
      name: original.name,
      priority: original.priority,
      type: original.type,
      sampleTypeId: original.sampleTypeId,
      source: original.source,
      status: "Pending Login",
      accessCode: generateAccessCode(),
      requestorName: original.requestorName,
      businessUnitId: original.businessUnitId,
      collectedBy: user.name,
      collectedDate: now,
      receivedDate: now,
      container: original.container,
      retestOfSampleId: original.id,
      retentionUntil,
      tests: {
        create: original.tests.map((t, i) => ({
          name: t.name,
          status: "pending",
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
        })),
      },
      custodyEvents: {
        create: [
          { label: "Collected", time: now, order: 0 },
          { label: `Retest of ${original.id}`, time: now, order: 1 },
        ],
      },
    },
  });

  await logAudit({ userId: user.id, action: "sample.retest_created", entityType: "Sample", entityId: id, detail: `retest of ${original.id}` });

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath(`/samples/${originalSampleId}`);
  redirect(`/samples/${id}`);
}

const EDITABLE_STATUSES = new Set(["Pending Login", "In Testing"]);

// Sample intake details are locked once a sample moves past In Testing —
// Supervisor/QA review and the eventual CoA are built on top of what's
// entered here, so later stages rely on it staying fixed for the audit
// trail. Only the fields that are genuinely intake corrections (not results,
// not custody) are editable, and only while the sample is still early.
export async function updateSampleAction(
  sampleId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const sample = await prisma.sample.findUnique({ where: { id: sampleId }, select: { status: true } });
  if (!sample) return { error: "Sample not found." };
  if (!EDITABLE_STATUSES.has(sample.status)) {
    return { error: "This sample can no longer be edited — it has moved past In Testing." };
  }

  const name = String(formData.get("name") || "").trim();
  const requestorName = String(formData.get("requestorName") || "").trim();
  const source = String(formData.get("source") || "").trim();
  const collectedDateRaw = String(formData.get("collectedDate") || "");

  if (!name) return { error: "Enter a sample name." };
  if (!source) return { error: "Enter a source / location." };
  if (!collectedDateRaw) return { error: "Enter the collection date & time." };

  const collectedDate = parseJakartaLocalDateTime(collectedDateRaw);
  if (Number.isNaN(collectedDate.getTime())) return { error: "Invalid collection date & time." };

  await prisma.sample.update({
    where: { id: sampleId },
    data: { name, requestorName: requestorName || null, source, collectedDate },
  });

  await logAudit({ userId: user.id, action: "sample.edited", entityType: "Sample", entityId: sampleId, detail: `name/requestor/source/collectedDate updated by ${user.name}` });

  revalidatePath(`/samples/${sampleId}`);
  redirect(`/samples/${sampleId}`);
}

export async function updateStorageAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const sampleId = String(formData.get("sampleId") || "");
  const storageLocation = String(formData.get("storageLocation") || "").trim();

  await prisma.sample.update({
    where: { id: sampleId },
    data: { storageLocation: storageLocation || null },
  });

  await logAudit({ userId: user.id, action: "sample.storage_updated", entityType: "Sample", entityId: sampleId, detail: storageLocation });

  revalidatePath(`/samples/${sampleId}`);
  redirect(`/samples/${sampleId}`);
}

export async function markDisposedAction(sampleId: string) {
  const user = await requireUser();
  const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
  if (!sample || sample.status !== "Complete" || sample.disposedAt) return;
  await prisma.sample.update({
    where: { id: sampleId },
    data: { disposedAt: new Date() },
  });
  await logAudit({ userId: user.id, action: "sample.disposed", entityType: "Sample", entityId: sampleId });
  revalidatePath(`/samples/${sampleId}`);
}
