import { prisma } from "@/lib/db";

/**
 * Fan-out notification helper: creates one Notification row per recipient.
 * Every review-action notification site used to hardcode a single
 * recipient (the person who just clicked approve/reject, notifying
 * themself) — this exists so a site can notify everyone who actually
 * needs to know (the acting reviewer AND, e.g., the technician who
 * submitted the result) with one call.
 */
export async function notifyUsers(input: { userIds: string[]; title: string; body: string; sampleId?: string }) {
  const uniqueIds = [...new Set(input.userIds)].filter(Boolean);
  if (uniqueIds.length === 0) return;
  await prisma.notification.createMany({
    data: uniqueIds.map((userId) => ({
      userId,
      title: input.title,
      body: input.body,
      sampleId: input.sampleId,
      unread: true,
    })),
  });
}

/** Distinct users who submitted at least one test result on this sample. */
export async function getSubmitterIds(sampleId: string): Promise<string[]> {
  const rows = await prisma.test.findMany({
    where: { sampleId, submittedById: { not: null } },
    select: { submittedById: true },
    distinct: ["submittedById"],
  });
  return rows.map((r) => r.submittedById).filter((id): id is string => id != null);
}
