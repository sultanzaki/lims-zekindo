import { prisma } from "@/lib/db";
import { signedUrlFor } from "@/lib/storage";
import { stageIndexFor } from "@/lib/publicStage";

export { stageIndexFor, clientStageLabel, clientStageColors } from "@/lib/publicStage";

export async function loadPublicSample(id: string) {
  return prisma.sample.findUnique({
    where: { id },
    include: {
      sampleType: { select: { targetTatHours: true } },
      businessUnit: { select: { name: true } },
      tests: { orderBy: { order: "asc" }, include: { attachments: { orderBy: { uploadedAt: "asc" } } } },
      reports: { orderBy: { uploadedAt: "desc" } },
    },
  });
}

export type PublicSample = NonNullable<Awaited<ReturnType<typeof loadPublicSample>>>;

export async function preparePublicSampleView(sample: PublicSample) {
  const rejected = sample.status === "Rejected";
  const completed = sample.status === "Complete";
  const stageIndex = stageIndexFor(sample.status);
  const targetHours = sample.sampleType?.targetTatHours ?? 48;
  const estimatedCompletion = new Date(sample.receivedDate.getTime() + targetHours * 60 * 60 * 1000);

  // Values and supporting documents are only shown once the whole sample has
  // cleared supervisor + QA review — a result can still be corrected during
  // review, so nothing preliminary goes out under the lab's name.
  // Per-parameter progress (submitted/not) is safe to show at any stage.
  const testsWithUrls = await Promise.all(
    sample.tests.map(async (test) => ({
      ...test,
      attachments: completed
        ? await Promise.all(test.attachments.map(async (a) => ({ ...a, url: await signedUrlFor(a.fileType, a.storagePath) })))
        : [],
    }))
  );
  const testedCount = sample.tests.filter((t) => t.status === "awaiting" || completed).length;
  const totalCount = sample.tests.length;
  const progressPct = totalCount > 0 ? Math.round((testedCount / totalCount) * 100) : 0;

  const reportsWithUrls = completed
    ? await Promise.all(sample.reports.map(async (r) => ({ ...r, url: await signedUrlFor(r.fileType, r.storagePath) })))
    : [];

  return {
    rejected,
    completed,
    stageIndex,
    targetHours,
    estimatedCompletion,
    testsWithUrls,
    reportsWithUrls,
    testedCount,
    totalCount,
    progressPct,
  };
}

export type PublicSampleView = Awaited<ReturnType<typeof preparePublicSampleView>>;
