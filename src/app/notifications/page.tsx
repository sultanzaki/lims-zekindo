import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { relativeTime } from "@/lib/format";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import { markAllReadAction } from "@/lib/actions/notifications";
import EmptyState from "@/components/ui/EmptyState";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const hasUnread = notifications.some((n) => n.unread);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <TopNav active="notif" hasUnread={hasUnread} role={user.accessRole} userName={user.name} />
      <div className="sticky top-0 md:top-16 bg-white border-b border-border px-5 pt-6 pb-4 z-10 flex items-center justify-between">
        <h1 className="text-[19px] font-bold text-text tracking-tight">Alerts</h1>
        <form action={markAllReadAction}>
          <button type="submit" className="text-xs font-semibold text-primary cursor-pointer">
            Mark all read
          </button>
        </form>
      </div>

      <div className="flex-1 px-5 pt-3.5 pb-5 flex flex-col gap-2">
        {notifications.map((n) => (
          <Link
            key={n.id}
            href={n.sampleId ? `/samples/${n.sampleId}` : "/notifications"}
            className="flex gap-2.5 items-start bg-white border border-border rounded-xl p-3.5"
          >
            <div
              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
              style={{ background: n.unread ? "#2B8DB8" : "transparent" }}
            />
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-text">{n.title}</div>
              <div className="text-xs text-muted mt-[3px] leading-snug">{n.body}</div>
              <div className="text-[11px] text-faint mt-1.5">{relativeTime(n.createdAt)}</div>
            </div>
          </Link>
        ))}
        {notifications.length === 0 && <EmptyState>No notifications yet.</EmptyState>}
      </div>

      <BottomNav active="notif" hasUnread={hasUnread} />
    </div>
  );
}
