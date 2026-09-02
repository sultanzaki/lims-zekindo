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
const ALLOWED_REPORT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
]);
const canManageReports = (role: string) => canReviewAsSupervisor(role) || canApproveAsQa(role) || isAdmin(role);

export type FormState = { error?: string };

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

  const sampleType = await prisma.sampleTypeCatalog.findUnique({
    where: { id: sampleTypeId },
    include: { tests: { where: { active: true }, orderBy: { order: "asc" } } },
  });
  if (!sampleType) return { error: "Sample type not found." };

  const collectedDate = collectedDateRaw ? parseJakartaLocalDateTime(collectedDateRaw) : new Date();
  const now = new Date();
  const id = await getNextSampleId();
  const retentionUntil = new Date(now.getTime() + sampleType.retentionDays * 24 * 60 * 60 * 1000);

  const testsToCreate =
    sampleType.tests.length > 0
      ? sampleType.tests.map((t, i) => ({
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
  if (!ALLOWED_REPORT_TYPES.has(file.type)) {
    return { error: "Unsupported file type. Use a PDF, Word, Excel, or image file." };
  }

  const sample = await prisma.sample.findUnique({ where: { id: sampleId }, select: { id: true } });
  if (!sample) return { error: "Sample not found." };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `reports/${sampleId}/${randomUUID()}-${safeName}`;

  try {
    await uploadAttachment(storagePath, file);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }

  await prisma.sampleReport.create({
    data: {
      sampleId,
      fileName: file.name,
      fileType: file.type,
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

async function openDeviationForRejection(sampleId: string, sampleType: string, userId: string, stage: string) {
  await prisma.deviation.create({
    data: {
      sampleId,
      description: `Result rejected at ${stage} review. ${sampleType} did not meet acceptance criteria.`,
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
  const eventCount = await prisma.custodyEvent.count({ where: { sampleId: sample.id } });
  await prisma.sample.update({
    where: { id: sample.id },
    data: {
      status: "Awaiting QA Approval",
      reviewedByRole: user.role,
      custodyEvents: {
        create: [{ label: `Supervisor Reviewed (${user.name})`, time: new Date(), order: eventCount }],
      },
    },
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
  const eventCount = await prisma.custodyEvent.count({ where: { sampleId: sample.id } });
  const submitterIds = await getSubmitterIds(sample.id);
  await prisma.$transaction([
    prisma.test.updateMany({ where: { sampleId: sample.id, status: "awaiting" }, data: { status: "complete" } }),
    prisma.sample.update({
      where: { id: sample.id },
      data: {
        status: "Complete",
        approvedBy: `${user.name}, ${user.role}`,
        approvedAt: new Date(),
        custodyEvents: { create: [{ label: "QA Approved", time: new Date(), order: eventCount }] },
      },
    }),
  ]);
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

  await performSupervisorApprove(sample, user);

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath(`/samples/${sampleId}`);
  return {};
}

async function performSupervisorReject(sample: { id: string; type: string }, user: { id: string; name: string; email: string }) {
  const eventCount = await prisma.custodyEvent.count({ where: { sampleId: sample.id } });
  const submitterIds = await getSubmitterIds(sample.id);
  await prisma.sample.update({
    where: { id: sample.id },
    data: {
      status: "Rejected",
      custodyEvents: {
        create: [{ label: `Supervisor Rejected (${user.name})`, time: new Date(), order: eventCount }],
      },
    },
  });
  await notifyUsers({
    userIds: [user.id, ...submitterIds],
    title: `Supervisor rejected ${sample.id}`,
    body: `${sample.type} did not pass supervisor review. Recollection may be required.`,
    sampleId: sample.id,
  });
  await openDeviationForRejection(sample.id, sample.type, user.id, "supervisor");
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

  const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
  if (!sample || sample.status !== "Awaiting Supervisor Review") return { error: "This sample is no longer awaiting supervisor review." };

  await performSupervisorReject(sample, user);

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

  await performQaApprove(sample, user);

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

  for (const sampleId of sampleIds) {
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

async function performQaReject(sample: { id: string; type: string }, user: { id: string; name: string; email: string }) {
  const eventCount = await prisma.custodyEvent.count({ where: { sampleId: sample.id } });
  const submitterIds = await getSubmitterIds(sample.id);
  await prisma.sample.update({
    where: { id: sample.id },
    data: {
      status: "Rejected",
      custodyEvents: { create: [{ label: "QA Rejected", time: new Date(), order: eventCount }] },
    },
  });
  await notifyUsers({
    userIds: [user.id, ...submitterIds],
    title: `QA rejected ${sample.id}`,
    body: `${sample.type} did not meet spec. Recollection requested.`,
    sampleId: sample.id,
  });
  await openDeviationForRejection(sample.id, sample.type, user.id, "QA");
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

  const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
  if (!sample || sample.status !== "Awaiting QA Approval") return { error: "This sample is no longer awaiting QA approval." };

  await performQaReject(sample, user);

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
