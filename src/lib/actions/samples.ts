"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getNextSampleId } from "@/lib/data";

export type FormState = { error?: string };

export async function createSampleAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();

  const type = String(formData.get("type") || "").trim();
  const source = String(formData.get("source") || "").trim();
  const collectedBy = String(formData.get("collectedBy") || user.name).trim();
  const collectedDateRaw = String(formData.get("collectedDate") || "");

  if (!type) {
    return { error: "Select a sample type." };
  }

  const collectedDate = collectedDateRaw ? new Date(collectedDateRaw) : new Date();
  const now = new Date();
  const id = await getNextSampleId();

  await prisma.sample.create({
    data: {
      id,
      type,
      source: source || "—",
      status: "Pending Login",
      collectedBy: collectedBy || user.name,
      collectedDate,
      receivedDate: now,
      container: "Sterile bag",
      tests: {
        create: [{ name: `${type} — Screening`, status: "pending", unit: "", spec: "Per SOP", order: 0 }],
      },
      custodyEvents: {
        create: [
          { label: "Collected", time: collectedDate, order: 0 },
          { label: "Received at Lab", time: now, order: 1 },
          { label: "Logged In", time: now, order: 2 },
        ],
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  redirect(`/samples/${id}`);
}

export async function submitTestResultAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  await requireUser();

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

  if (allSubmitted && sample.status !== "Awaiting Approval") {
    const eventCount = await prisma.custodyEvent.count({ where: { sampleId } });
    const events = [];
    if (sample.status === "Pending Login") {
      events.push({ label: "Testing Started", time: new Date(), order: eventCount + events.length });
    }
    events.push({ label: "Result Submitted", time: new Date(), order: eventCount + events.length });

    await prisma.sample.update({
      where: { id: sampleId },
      data: {
        status: "Awaiting Approval",
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

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath(`/samples/${sampleId}`);
  redirect(`/samples/${sampleId}`);
}

export async function approveSampleAction(sampleId: string) {
  const user = await requireUser();
  const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
  if (!sample || sample.status !== "Awaiting Approval") return;

  const eventCount = await prisma.custodyEvent.count({ where: { sampleId } });
  await prisma.sample.update({
    where: { id: sampleId },
    data: {
      status: "Complete",
      approvedBy: "Dr. R. Kusuma, QA Manager",
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

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath(`/samples/${sampleId}`);
  revalidatePath("/notifications");
}

export async function rejectSampleAction(sampleId: string) {
  const user = await requireUser();
  const sample = await prisma.sample.findUnique({ where: { id: sampleId } });
  if (!sample || sample.status !== "Awaiting Approval") return;

  const eventCount = await prisma.custodyEvent.count({ where: { sampleId } });
  await prisma.sample.update({
    where: { id: sampleId },
    data: {
      status: "Rejected",
      custodyEvents: {
        create: [{ label: "QA Rejected", time: new Date(), order: eventCount }],
      },
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

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath(`/samples/${sampleId}`);
  revalidatePath("/notifications");
}
