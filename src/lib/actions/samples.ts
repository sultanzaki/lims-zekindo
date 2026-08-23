"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { getNextSampleId } from "@/lib/data";
import { logAudit } from "@/lib/audit";
import { canReviewAsSupervisor, canApproveAsQa } from "@/lib/roles";
import { uploadAttachment, deleteAttachment } from "@/lib/storage";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);

export type FormState = { error?: string };

export async function createSampleAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const name = String(formData.get("name") || "").trim();
  const sampleTypeId = String(formData.get("sampleTypeId") || "");
  const source = String(formData.get("source") || "").trim();
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

  const collectedDate = collectedDateRaw ? new Date(collectedDateRaw) : new Date();
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
  const result = String(formData.get("result") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!result) {
    return { error: "Enter a result before submitting." };
  }

  const sample = await prisma.sample.findUnique({
    where: { id: sampleId },
    include: { tests: true },
  });
  if (!sample) return { error: "Sample not found." };

  await prisma.test.update({
    where: { id: testId },
    data: { status: "awaiting", result, notes: notes || null },
  });

  const otherTests = sample.tests.filter((t) => t.id !== testId);
  const allSubmitted = otherTests.every((t) => t.status !== "pending");

  if (allSubmitted && sample.status !== "Awaiting Supervisor Review") {
    const eventCount = await prisma.custodyEvent.count({ where: { sampleId } });
    const events = [];
    if (sample.status === "Pending Login") {
      events.push({ label: "Testing Started", time: new Date(), order: eventCount + events.length });
    }
    events.push({ label: "Result Submitted", time: new Date(), order: eventCount + events.length });

    await prisma.sample.update({
      where: { id: sampleId },
      data: {
        status: "Awaiting Supervisor Review",
        custodyEvents: { create: events },
      },
    });
  } else if (sample.status === "Pending Login") {
    const eventCount = await prisma.custodyEvent.count({ where: { sampleId } });
    await prisma.sample.update({
      where: { id: sampleId },
      data: {
        status: "In Testing",
        custodyEvents: { create: [{ label: "Testing Started", time: new Date(), order: eventCount }] },
      },
    });
  }

  await logAudit({ userId: user.id, action: "test.result_submitted", entityType: "Test", entityId: testId, detail: result });

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
  const value = String(formData.get("value") || "").trim();
  const intervalLabel = String(formData.get("intervalLabel") || "").trim() || null;
  const replicateIndexRaw = String(formData.get("replicateIndex") || "").trim();
  const note = String(formData.get("note") || "").trim();

  if (!value) return { error: "Enter a reading value." };

  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test || test.sampleId !== sampleId) return { error: "Test not found." };
  if (test.status !== "pending") return { error: "This test has already been submitted — readings are locked." };

  const replicateIndex = replicateIndexRaw ? Number(replicateIndexRaw) : null;

  await prisma.testReading.create({
    data: {
      testId,
      intervalLabel,
      replicateIndex: replicateIndex && Number.isFinite(replicateIndex) ? replicateIndex : null,
      value,
      note: note || null,
      enteredBy: user.name,
    },
  });

  await logAudit({ userId: user.id, action: "test.reading_added", entityType: "Test", entityId: testId, detail: value });

  revalidatePath(`/samples/${sampleId}/tests/${testId}`);
  return {};
}

export async function deleteTestReadingAction(sampleId: string, testId: string, readingId: string) {
  const user = await requireUser();
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test || test.sampleId !== sampleId || test.status !== "pending") return;

  // Scope the delete to this test (not just the reading's own id) so a
  // readingId can never remove a row belonging to a different test.
  await prisma.testReading.deleteMany({ where: { id: readingId, testId } });
  await logAudit({ userId: user.id, action: "test.reading_removed", entityType: "Test", entityId: testId, detail: readingId });

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
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (file.size > MAX_ATTACHMENT_BYTES) return { error: "File is too large (max 10MB)." };
  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    return { error: "Unsupported file type. Use a photo (JPG/PNG) or an Excel/CSV file." };
  }

  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test || test.sampleId !== sampleId) return { error: "Test not found." };
  if (test.status !== "pending") return { error: "This test has already been submitted — attachments are locked." };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${sampleId}/${testId}/${randomUUID()}-${safeName}`;

  try {
    await uploadAttachment(storagePath, file);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }

  await prisma.testAttachment.create({
    data: {
      testId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      storagePath,
      uploadedBy: user.name,
    },
  });

  await logAudit({ userId: user.id, action: "test.attachment_added", entityType: "Test", entityId: testId, detail: file.name });

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

  const eventCount = await prisma.custodyEvent.count({ where: { sampleId } });
  await prisma.sample.update({
    where: { id: sampleId },
    data: {
      status: "Awaiting QA Approval",
      custodyEvents: {
        create: [{ label: `Supervisor Reviewed (${user.name})`, time: new Date(), order: eventCount }],
      },
    },
  });

  await logAudit({ userId: user.id, action: "sample.supervisor_approved", entityType: "Sample", entityId: sampleId, detail: `e-signed by ${user.email}` });

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath(`/samples/${sampleId}`);
  return {};
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

  const eventCount = await prisma.custodyEvent.count({ where: { sampleId } });
  await prisma.sample.update({
    where: { id: sampleId },
    data: {
      status: "Rejected",
      custodyEvents: {
        create: [{ label: `Supervisor Rejected (${user.name})`, time: new Date(), order: eventCount }],
      },
      notifications: {
        create: {
          userId: user.id,
          title: `Supervisor rejected ${sampleId}`,
          body: `${sample.type} did not pass supervisor review. Recollection may be required.`,
          unread: true,
        },
      },
    },
  });

  await openDeviationForRejection(sampleId, sample.type, user.id, "supervisor");
  await logAudit({ userId: user.id, action: "sample.supervisor_rejected", entityType: "Sample", entityId: sampleId, detail: `e-signed by ${user.email}` });

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

  const eventCount = await prisma.custodyEvent.count({ where: { sampleId } });
  await prisma.sample.update({
    where: { id: sampleId },
    data: {
      status: "Complete",
      approvedBy: `${user.name}, ${user.role}`,
      approvedAt: new Date(),
      custodyEvents: { create: [{ label: "QA Approved", time: new Date(), order: eventCount }] },
      notifications: {
        create: {
          userId: user.id,
          title: `Result approved — ${sampleId}`,
          body: `${sample.type} passed QA review and is ready for release.`,
          unread: true,
        },
      },
    },
  });

  await logAudit({ userId: user.id, action: "sample.qa_approved", entityType: "Sample", entityId: sampleId, detail: `e-signed by ${user.email}` });

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath(`/samples/${sampleId}`);
  revalidatePath("/notifications");
  return {};
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

  const eventCount = await prisma.custodyEvent.count({ where: { sampleId } });
  await prisma.sample.update({
    where: { id: sampleId },
    data: {
      status: "Rejected",
      custodyEvents: { create: [{ label: "QA Rejected", time: new Date(), order: eventCount }] },
      notifications: {
        create: {
          userId: user.id,
          title: `QA rejected ${sampleId}`,
          body: `${sample.type} did not meet spec. Recollection requested.`,
          unread: true,
        },
      },
    },
  });

  await openDeviationForRejection(sampleId, sample.type, user.id, "QA");
  await logAudit({ userId: user.id, action: "sample.qa_rejected", entityType: "Sample", entityId: sampleId, detail: `e-signed by ${user.email}` });

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
    include: { tests: true },
  });
  if (!original || original.status !== "Rejected") return;

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
  await prisma.sample.update({
    where: { id: sampleId },
    data: { disposedAt: new Date() },
  });
  await logAudit({ userId: user.id, action: "sample.disposed", entityType: "Sample", entityId: sampleId });
  revalidatePath(`/samples/${sampleId}`);
}
