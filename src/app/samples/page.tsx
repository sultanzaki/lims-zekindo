import { requirePageUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { prisma } from "@/lib/db";
import { SAMPLE_STATUSES } from "@/lib/status";
import { fetchCursorPage } from "@/lib/pagination";
import SamplesClient from "@/components/SamplesClient";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Samples" };

const PAGE_SIZE = 50;

const SELECT = {
  id: true,
  name: true,
  type: true,
  source: true,
  status: true,
  collectedBy: true,
  receivedDate: true,
  approvedAt: true,
  sampleType: { select: { targetTatHours: true } },
} satisfies Prisma.SampleSelect;

const ORDER_BY: Prisma.SampleOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "desc" }];

export default async function SamplesPage({ searchParams }: PageProps<"/samples">) {
  const user = await requirePageUser();
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : "");

  const statusParam = get("status");
  const status = statusParam && (SAMPLE_STATUSES as readonly string[]).includes(statusParam) ? statusParam : "All";
  const q = get("q").trim();
  const dateFrom = get("from");
  const dateTo = get("to");
  const after = get("after") || undefined;
  const before = get("before") || undefined;

  const where: Prisma.SampleWhereInput = {};
  if (status !== "All") where.status = status;
  if (dateFrom || dateTo) {
    where.receivedDate = {
      ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00`) } : {}),
      ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59`) } : {}),
    };
  }
  if (q) {
    where.OR = [
      { id: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { type: { contains: q, mode: "insensitive" } },
      { source: { contains: q, mode: "insensitive" } },
      { collectedBy: { contains: q, mode: "insensitive" } },
    ];
  }

  const [{ rows: samples, pageInfo }, statusCountsRaw, unread] = await Promise.all([
    fetchCursorPage(
      (args) => prisma.sample.findMany({ where, select: SELECT, orderBy: ORDER_BY, ...args }),
      { after, before, pageSize: PAGE_SIZE }
    ),
    // Counts reflect the full table, independent of the current search/date
    // filter — same as before pagination, so switching status tabs always
    // shows how many samples exist in each status overall.
    prisma.sample.groupBy({ by: ["status"], _count: { _all: true } }),
    getUnreadCount(user.id),
  ]);

  const statusCounts: Record<string, number> = { All: 0 };
  for (const s of SAMPLE_STATUSES) statusCounts[s] = 0;
  for (const row of statusCountsRaw) {
    statusCounts[row.status] = row._count._all;
    statusCounts.All += row._count._all;
  }

  return (
    <SamplesClient
      samples={samples}
      unreadCount={unread}
      role={user.accessRole}
      userName={user.name}
      initialStatus={status}
      initialQuery={q}
      initialDateFrom={dateFrom}
      initialDateTo={dateTo}
      statusCounts={statusCounts}
      pageInfo={pageInfo}
    />
  );
}
