import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { uploadAttachment } from "@/lib/storage";
import { detectUploadType } from "@/lib/fileType";
import type { User } from "@prisma/client";

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
// Legacy allow-list kept for the client-side hint + backward-compatible
// message wording; the authoritative check is now content-based
// (detectUploadType in lib/fileType.ts).
export const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);

// The actual DB-mutating logic behind the test-result-entry Server Actions
// in src/lib/actions/samples.ts, extracted so the mobile Route Handlers
// under src/app/api/mobile/samples/[id]/tests/[testId]/* can reuse the exact
// same rules (locking, status transitions, audit log) instead of
// reimplementing them against a different input shape (JSON body vs
// FormData). The Server Actions and the Route Handlers are both thin
// wrappers around these.

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function submitTestResultCore(
  user: User,
  sampleId: string,
  testId: string,
  result: string,
  notes: string
): Promise<ActionResult> {
  const trimmedResult = result.trim();
  if (!trimmedResult) return { ok: false, error: "Enter a result before submitting." };

  const sample = await prisma.sample.findUnique({
    where: { id: sampleId },
    include: { tests: true },
  });
  if (!sample) return { ok: false, error: "Sample not found." };

  const test = sample.tests.find((t) => t.id === testId);
  if (!test) return { ok: false, error: "Test not found on this sample." };
  if (test.status !== "pending") return { ok: false, error: "This test has already been submitted." };

  await prisma.test.update({
    where: { id: testId },
    data: { status: "awaiting", result: trimmedResult, notes: notes.trim() || null, submittedById: user.id },
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

  await logAudit({
    userId: user.id,
    action: "test.result_submitted",
    entityType: "Test",
    entityId: testId,
    detail: trimmedResult,
  });

  return { ok: true };
}

export async function addTestReadingCore(
  user: User,
  sampleId: string,
  testId: string,
  input: { value: string; intervalLabel?: string | null; replicateIndex?: number | null; note?: string | null }
): Promise<ActionResult> {
  const value = input.value.trim();
  if (!value) return { ok: false, error: "Enter a reading value." };

  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test || test.sampleId !== sampleId) return { ok: false, error: "Test not found." };
  if (test.status !== "pending") {
    return { ok: false, error: "This test has already been submitted — readings are locked." };
  }

  const replicateIndex = input.replicateIndex;

  await prisma.testReading.create({
    data: {
      testId,
      intervalLabel: input.intervalLabel || null,
      replicateIndex: replicateIndex != null && Number.isFinite(replicateIndex) ? replicateIndex : null,
      value,
      note: input.note?.trim() || null,
      enteredBy: user.name,
    },
  });

  await logAudit({ userId: user.id, action: "test.reading_added", entityType: "Test", entityId: testId, detail: value });

  return { ok: true };
}

export async function deleteTestReadingCore(
  sampleId: string,
  testId: string,
  readingId: string,
  user: User
): Promise<ActionResult> {
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test || test.sampleId !== sampleId || test.status !== "pending") {
    return { ok: false, error: "Reading can't be removed." };
  }

  // Scope the delete to this test (not just the reading's own id) so a
  // readingId can never remove a row belonging to a different test.
  await prisma.testReading.deleteMany({ where: { id: readingId, testId } });
  await logAudit({ userId: user.id, action: "test.reading_removed", entityType: "Test", entityId: testId, detail: readingId });

  return { ok: true };
}

export async function uploadTestAttachmentCore(
  user: User,
  sampleId: string,
  testId: string,
  file: File
): Promise<ActionResult> {
  if (file.size === 0) return { ok: false, error: "Choose a file to upload." };
  if (file.size > MAX_ATTACHMENT_BYTES) return { ok: false, error: "File is too large (max 10MB)." };

  // Content-based validation — the client's file.type label is not trusted
  // on its own (it is trivially spoofable). We read the file's magic bytes
  // and only accept a match against the allow-list.
  const detected = await detectUploadType(file, file.type);
  if (!detected) {
    return { ok: false, error: "Unsupported file type. Use a photo (JPG/PNG/WebP) or an Excel/CSV file." };
  }
  // HEIC photos from iPhones are not detectable by our magic-byte set and
  // can't be rendered inline by browsers anyway — reject them with a clear
  // message rather than accepting an unverifiable upload.
  if (file.type === "image/heic" || file.type === "image/heif") {
    return { ok: false, error: "HEIC photos are not supported here. Convert to JPG/PNG first." };
  }

  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test || test.sampleId !== sampleId) return { ok: false, error: "Test not found." };
  if (test.status !== "pending") {
    return { ok: false, error: "This test has already been submitted — attachments are locked." };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${sampleId}/${testId}/${randomUUID()}-${safeName}`;

  try {
    await uploadAttachment(storagePath, file, detected.mime);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }

  await prisma.testAttachment.create({
    data: {
      testId,
      fileName: file.name,
      // Store the content-detected type, not the client label, so the
      // signed URL later serves it with the correct Content-Type.
      fileType: detected.mime,
      fileSize: file.size,
      storagePath,
      uploadedBy: user.name,
    },
  });

  await logAudit({ userId: user.id, action: "test.attachment_added", entityType: "Test", entityId: testId, detail: file.name });

  return { ok: true };
}
