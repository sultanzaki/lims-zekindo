import { prisma } from "@/lib/db";
import { relativeTime, dueLabelFor } from "@/lib/format";
import { SAMPLE_STATUS_SHORT, CUSTODY_DOT_COLOR, type SampleStatus } from "@/lib/status";

const OPEN_STATUSES = ["Pending Login", "In Testing", "Awaiting Supervisor Review", "Awaiting QA Approval"];

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, unread: true } });
}

export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  sampleId: string | null;
  unread: boolean;
  createdAt: Date;
};

// Shared by the web notifications bell/page (src/lib/actions/notifications.ts,
// which resolves userId from the cookie session) and the mobile
// GET /api/mobile/notifications route (which resolves it from the Bearer
// token) — same query, same shape, whichever auth surface called it.
export async function listNotifications(userId: string): Promise<NotificationRow[]> {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return notifications.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    sampleId: n.sampleId,
    unread: n.unread,
    createdAt: n.createdAt,
  }));
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, unread: true },
    data: { unread: false },
  });
}

export async function getDashboardData() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    pendingLogin,
    inTesting,
    awaitingReview,
    overdueRows,
    overdueCountRows,
    rejectedEvents,
    queueRows,
    approvedLast7,
    rejectedLast7,
  ] = await Promise.all([
    prisma.sample.count({ where: { status: "Pending Login" } }),
    prisma.sample.count({ where: { status: "In Testing" } }),
    prisma.sample.count({ where: { status: { in: ["Awaiting Supervisor Review", "Awaiting QA Approval"] } } }),
    prisma.$queryRaw<{ id: string }[]>`
      SELECT s.id FROM "Sample" s
      LEFT JOIN "SampleTypeCatalog" c ON s."sampleTypeId" = c.id
      WHERE s.status = ANY(${OPEN_STATUSES})
      AND s."receivedDate" + (COALESCE(c."targetTatHours", 48) || ' hours')::interval < now()
      ORDER BY s."receivedDate" ASC
      LIMIT 3
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM "Sample" s
      LEFT JOIN "SampleTypeCatalog" c ON s."sampleTypeId" = c.id
      WHERE s.status = ANY(${OPEN_STATUSES})
      AND s."receivedDate" + (COALESCE(c."targetTatHours", 48) || ' hours')::interval < now()
    `,
    prisma.custodyEvent.findMany({
      where: { label: { contains: "Rejected" }, sample: { status: "Rejected" } },
      orderBy: { time: "desc" },
      take: 3,
      include: { sample: { select: { id: true, name: true, type: true, source: true } } },
    }),
    prisma.sample.findMany({
      where: { status: { in: OPEN_STATUSES } },
      orderBy: { receivedDate: "asc" },
      take: 5,
      include: { sampleType: { select: { targetTatHours: true } } },
    }),
    prisma.sample.count({ where: { status: "Complete", approvedAt: { gte: sevenDaysAgo } } }),
    prisma.custodyEvent.count({ where: { label: { contains: "Rejected" }, time: { gte: sevenDaysAgo } } }),
  ]);

  const overdueCount = Number(overdueCountRows[0]?.count ?? 0);
  const overdueIds = overdueRows.map((r) => r.id);
  const overdueSamples = overdueIds.length
    ? await prisma.sample.findMany({ where: { id: { in: overdueIds } } })
    : [];

  type AttentionItem = {
    id: string;
    tag: "REJECTED" | "OVERDUE";
    title: string;
    body: string;
  };

  const attentionItems: AttentionItem[] = [
    ...rejectedEvents.map((e) => ({
      id: e.sample.id,
      tag: "REJECTED" as const,
      title: e.sample.name || e.sample.id,
      body: e.detail || `${e.sample.type} · ${e.sample.source}`,
    })),
    ...overdueSamples.map((s) => ({
      id: s.id,
      tag: "OVERDUE" as const,
      title: s.name || s.id,
      body: `${s.type} · Received ${relativeTime(s.receivedDate)}`,
    })),
  ].slice(0, 4);

  const queueSamples = queueRows.map((s) => {
    const due = dueLabelFor(s.receivedDate, s.sampleType?.targetTatHours ?? 48);
    return {
      id: s.id,
      name: s.name,
      type: s.type,
      source: s.source,
      status: s.status,
      dotColor: CUSTODY_DOT_COLOR[s.status as SampleStatus] ?? "#93A6B0",
      statusShort: SAMPLE_STATUS_SHORT[s.status as SampleStatus] ?? s.status,
      dueLabel: due.label,
      dueColor: due.color,
    };
  });

  const reviewedLast7 = approvedLast7 + rejectedLast7;
  const passRate = reviewedLast7 > 0 ? Math.round((approvedLast7 / reviewedLast7) * 100) : null;

  return {
    pendingLogin,
    inTesting,
    awaitingReview,
    overdueCount,
    attentionItems,
    queueSamples,
    approvedLast7,
    rejectedLast7,
    passRate,
  };
}

export async function getSampleDetail(id: string) {
  return prisma.sample.findUnique({
    where: { id },
    include: {
      tests: { orderBy: { order: "asc" }, include: { attachments: { orderBy: { uploadedAt: "desc" } } } },
      custodyEvents: { orderBy: { order: "asc" } },
      sampleType: true,
      businessUnit: true,
      deviations: { orderBy: { openedAt: "desc" } },
      retestOf: { select: { id: true, type: true } },
      retests: { select: { id: true, type: true, status: true } },
      reports: { orderBy: { uploadedAt: "desc" } },
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
