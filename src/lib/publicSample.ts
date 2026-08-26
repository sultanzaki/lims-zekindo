import { prisma } from "@/lib/db";
import { signedAttachmentUrl } from "@/lib/storage";

// Shared between the per-sample tracking portal (/track) and the
// Business-Unit client portal (/portal/[token]/samples/[id]) — both surfaces
// must apply the exact same "what's safe to show before QA sign-off" rule,
// so it lives in one place rather than being reimplemented twice and
// drifting apart.
export function stageIndexFor(status: string): number {
  switch (status) {
    case "Pending Login":
      return 0;
    case "In Testing":
      return 1;
    case "Awaiting Supervisor Review":
    case "Awaiting QA Approval":
      return 2;
    case "Complete":
      return 3;
    default:
      return 0;
  }
}

const CLIENT_STAGE_LABELS = ["Received", "Testing In Progress", "Under Review", "Completed"] as const;

// The same client-friendly vocabulary /track already uses for its stage
// timeline, reused for the BU portal's sample list rows — internal status
// strings like "Awaiting QA Approval" stay internal-only.
export function clientStageLabel(status: string): string {
  if (status === "Rejected") return "Needs Attention";
  return CLIENT_STAGE_LABELS[stageIndexFor(status)];
}

export function clientStageColors(status: string): { bg: string; color: string } {
  if (status === "Rejected") return { bg: "#FDECEA", color: "#B00016" };
  if (status === "Complete") return { bg: "#E6F4EA", color: "#1E7A34" };
  const idx = stageIndexFor(status);
  return idx >= 2 ? { bg: "#FEF3E0", color: "#9A6100" } : { bg: "#E8F4FA", color: "#1A5F7A" };
}

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
        ? await Promise.all(test.attachments.map(async (a) => ({ ...a, url: await signedAttachmentUrl(a.storagePath) })))
        : [],
    }))
  );
  const testedCount = sample.tests.filter((t) => t.status === "awaiting" || completed).length;
  const totalCount = sample.tests.length;
  const progressPct = totalCount > 0 ? Math.round((testedCount / totalCount) * 100) : 0;

  const reportsWithUrls = completed
    ? await Promise.all(sample.reports.map(async (r) => ({ ...r, url: await signedAttachmentUrl(r.storagePath) })))
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
