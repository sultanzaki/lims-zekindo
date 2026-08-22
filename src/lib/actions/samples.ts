"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { getNextSampleId } from "@/lib/data";
import { logAudit } from "@/lib/audit";
import { canReviewAsSupervisor, canApproveAsQa } from "@/lib/roles";

export type FormState = { error?: string };

export async function createSampleAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const sampleTypeId = String(formData.get("sampleTypeId") || "");
  const source = String(formData.get("source") || "").trim();
  const collectedBy = String(formData.get("collectedBy") || user.name).trim();
  const collectedDateRaw = String(formData.get("collectedDate") || "");
  const storageLocation = String(formData.get("storageLocation") || "").trim();

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
        }))
      : [{ name: `${sampleType.name} — Screening`, status: "pending", unit: "", spec: "Per SOP", order: 0 }];

  await prisma.sample.create({
    data: {
      id,
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

export async function supervisorApproveAction(sampleId: string) {
  const user = await requireRole(canReviewAsSupervisor);
  const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
  if (!sample || sample.status !== "Awaiting Supervisor Review") return;

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

  await logAudit({ userId: user.id, action: "sample.supervisor_approved", entityType: "Sample", entityId: sampleId });

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath(`/samples/${sampleId}`);
}

export async function supervisorRejectAction(sampleId: string) {
  const user = await requireRole(canReviewAsSupervisor);
  const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
  if (!sample || sample.status !== "Awaiting Supervisor Review") return;

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
  await logAudit({ userId: user.id, action: "sample.supervisor_rejected", entityType: "Sample", entityId: sampleId });

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath(`/samples/${sampleId}`);
  revalidatePath("/notifications");
  revalidatePath("/deviations");
}

export async function qaApproveAction(sampleId: string) {
  const user = await requireRole(canApproveAsQa);
  const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
  if (!sample || sample.status !== "Awaiting QA Approval") return;

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

  await logAudit({ userId: user.id, action: "sample.qa_approved", entityType: "Sample", entityId: sampleId });

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath(`/samples/${sampleId}`);
  revalidatePath("/notifications");
}

export async function qaRejectAction(sampleId: string) {
  const user = await requireRole(canApproveAsQa);
  const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
  if (!sample || sample.status !== "Awaiting QA Approval") return;

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
  await logAudit({ userId: user.id, action: "sample.qa_rejected", entityType: "Sample", entityId: sampleId });

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath(`/samples/${sampleId}`);
  revalidatePath("/notifications");
  revalidatePath("/deviations");
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
