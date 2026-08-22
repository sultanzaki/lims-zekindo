import { prisma } from "@/lib/db";

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, unread: true } });
}

export async function getDashboardData(userId: string) {
  const [pendingLogin, inTesting, awaitingApproval, alerts, recentSamples] = await Promise.all([
    prisma.sample.count({ where: { status: "Pending Login" } }),
    prisma.sample.count({ where: { status: "In Testing" } }),
    prisma.sample.count({ where: { status: "Awaiting Approval" } }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.sample.findMany({ orderBy: { createdAt: "desc" }, take: 4 }),
  ]);

  return { pendingLogin, inTesting, awaitingApproval, alerts, recentSamples };
}

export async function getSamples(search: string, status: string) {
  const q = search.trim().toLowerCase();
  const samples = await prisma.sample.findMany({ orderBy: { createdAt: "desc" } });
  return samples.filter((s) => {
    if (status !== "All" && s.status !== status) return false;
    if (!q) return true;
    return (
      s.id.toLowerCase().includes(q) ||
      s.type.toLowerCase().includes(q) ||
      s.source.toLowerCase().includes(q)
    );
  });
}

export async function getSampleDetail(id: string) {
  return prisma.sample.findUnique({
    where: { id },
    include: {
      tests: { orderBy: { order: "asc" } },
      custodyEvents: { orderBy: { order: "asc" } },
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
