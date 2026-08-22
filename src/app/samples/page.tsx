import { getCurrentUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { prisma } from "@/lib/db";
import SamplesClient from "@/components/SamplesClient";

export default async function SamplesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [samples, unread] = await Promise.all([
    prisma.sample.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, source: true, status: true },
    }),
    getUnreadCount(user.id),
  ]);

  return <SamplesClient samples={samples} hasUnread={unread > 0} />;
}
