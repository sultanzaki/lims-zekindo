import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { relativeTime } from "@/lib/format";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import { markAllReadAction } from "@/lib/actions/notifications";
import EmptyState from "@/components/ui/EmptyState";

function notifAccent(title: string) {
  const t = title.toLowerCase();
  if (t.includes("rejected") || t.includes("overdue") || t.includes("deviation")) {
    return { bg: "#FDECEA", color: "#D0021B" };
  }
  if (t.includes("approved") || t.includes("complete")) {
    return { bg: "#E6F4EA", color: "#28A745" };
  }
  return { bg: "#E8F4FA", color: "#2B8DB8" };
}

export default async function NotificationsPage() {
  const user = await requirePageUser();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unreadCount} />
      <div className="sticky top-0 bg-white border-b border-border-soft px-5 md:px-8 pt-6 md:pt-10 pb-3.5 z-10">
        <div className="md:max-w-[720px] md:w-full flex items-center justify-between">
          <h1 className="text-[19px] font-bold text-text tracking-tight">Alerts</h1>
          <form action={markAllReadAction}>
            <button type="submit" className="text-[13px] font-semibold text-primary cursor-pointer">
              Mark all read
            </button>
          </form>
        </div>
      </div>

      <div className="flex-1 px-5 md:px-8 pt-3.5 pb-5 flex flex-col gap-2.5 md:max-w-[720px] md:w-full">
        {notifications.map((n, i) => {
          const accent = notifAccent(n.title);
          return (
            <Link
              key={n.id}
              href={n.sampleId ? `/samples/${n.sampleId}` : "/notifications"}
              className="stagger-item flex gap-3 items-start rounded-2xl shadow-card-sm p-3.5 border"
              style={{
                background: n.unread ? "#FFFFFF" : "#FAFCFD",
                borderColor: n.unread ? "#D6E4EC" : "#EEF2F5",
                "--stagger": i,
              } as React.CSSProperties}
            >
              <div
                className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center shrink-0 mt-px"
                style={{ background: accent.bg }}
              >
                <div className="w-[9px] h-[9px] rounded-full" style={{ background: accent.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2.5">
                  <span className="text-sm font-semibold text-text leading-tight">{n.title}</span>
                  <span className="text-[11px] text-faint whitespace-nowrap shrink-0">{relativeTime(n.createdAt)}</span>
                </div>
                <div className="text-[13px] text-[#5B6B74] mt-1 leading-snug">{n.body}</div>
                {n.sampleId && (
                  <div className="text-xs font-semibold text-primary mt-1.5 font-mono-data">{n.sampleId} →</div>
                )}
              </div>
            </Link>
          );
        })}
        {notifications.length === 0 && <EmptyState>No notifications yet.</EmptyState>}
      </div>

      <BottomNav active="notif" unreadCount={unreadCount} />
    </div>
  );
}
