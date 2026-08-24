import { requirePageUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { prisma } from "@/lib/db";
import { SAMPLE_STATUSES } from "@/lib/status";
import SamplesClient from "@/components/SamplesClient";

export default async function SamplesPage({ searchParams }: PageProps<"/samples">) {
  const user = await requirePageUser();
  const { status } = await searchParams;
  const statusParam = typeof status === "string" ? status : undefined;
  const initialStatus = statusParam && (SAMPLE_STATUSES as readonly string[]).includes(statusParam)
    ? statusParam
    : "All";

  const [samples, unread] = await Promise.all([
    prisma.sample.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        source: true,
        status: true,
        collectedBy: true,
        receivedDate: true,
        approvedAt: true,
        sampleType: { select: { targetTatHours: true } },
      },
    }),
    getUnreadCount(user.id),
  ]);

  return (
    <SamplesClient
      samples={samples}
      unreadCount={unread}
      role={user.accessRole}
      userName={user.name}
      initialStatus={initialStatus}
    />
  );
}
