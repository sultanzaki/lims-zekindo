import { prisma } from "@/lib/db";

const OPEN_STATUSES = ["Pending Login", "In Testing", "Awaiting Supervisor Review", "Awaiting QA Approval"];

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, unread: true } });
}

export async function getDashboardData(userId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    pendingLogin,
    inTesting,
    awaitingReview,
    overdueRows,
    alerts,
    recentSamples,
    approvedLast7,
    rejectedLast7,
  ] = await Promise.all([
    prisma.sample.count({ where: { status: "Pending Login" } }),
    prisma.sample.count({ where: { status: "In Testing" } }),
    prisma.sample.count({ where: { status: { in: ["Awaiting Supervisor Review", "Awaiting QA Approval"] } } }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::int as count FROM "Sample" s
      LEFT JOIN "SampleTypeCatalog" c ON s."sampleTypeId" = c.id
      WHERE s.status = ANY(${OPEN_STATUSES})
      AND s."receivedDate" + (COALESCE(c."targetTatHours", 48) || ' hours')::interval < now()
    `,
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.sample.findMany({ orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.sample.count({ where: { status: "Complete", approvedAt: { gte: sevenDaysAgo } } }),
    prisma.custodyEvent.count({ where: { label: { contains: "Rejected" }, time: { gte: sevenDaysAgo } } }),
  ]);

  const reviewedLast7 = approvedLast7 + rejectedLast7;
  const passRate = reviewedLast7 > 0 ? Math.round((approvedLast7 / reviewedLast7) * 100) : null;

  return {
    pendingLogin,
    inTesting,
    awaitingReview,
    overdueCount: Number(overdueRows[0]?.count ?? 0),
    alerts,
    recentSamples,
    approvedLast7,
    rejectedLast7,
    passRate,
  };
}

export async function getSampleDetail(id: string) {
  return prisma.sample.findUnique({
    where: { id },
    include: {
      tests: { orderBy: { order: "asc" } },
      custodyEvents: { orderBy: { order: "asc" } },
      sampleType: true,
      deviations: { orderBy: { openedAt: "desc" } },
      retestOf: { select: { id: true, type: true } },
      retests: { select: { id: true, type: true, status: true } },
    },
  });
}

export async function getNextSampleId() {
  const latest = await prisma.sample.findMany({
    where: { id: { startsWith: "LAB-24-" } },
    select: { id: true },
  });
  const maxNum = latest.reduce((max, s) => {
    const n = parseInt(s.id.replace("LAB-24-0", "").replace("LAB-24-", ""), 10);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 144);
  return `LAB-24-0${maxNum + 1}`;
}
