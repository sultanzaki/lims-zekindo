"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import { relativeTime } from "@/lib/format";
import { notifAccent } from "@/lib/notifications";
import { getNotificationsAction, markAllReadAction, type NotificationRow } from "@/lib/actions/notifications";

export default function NotificationsBell({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[] | null>(null);
  const hasUnread = unreadCount > 0;

  async function openModal() {
    setOpen(true);
    setLoading(true);
    const rows = await getNotificationsAction();
    setNotifications(rows);
    setLoading(false);
  }

  async function markAllRead() {
    setNotifications((prev) => prev?.map((n) => ({ ...n, unread: false })) ?? null);
    await markAllReadAction();
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label="Alerts"
        className="hidden md:flex fixed top-4 right-6 z-30 w-10 h-10 rounded-full bg-white border border-border items-center justify-center text-muted hover:bg-chip-bg hover:text-text shadow-card-sm transition-colors cursor-pointer"
      >
        <Bell size={18} strokeWidth={2} />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-danger border-2 border-white" />
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Alerts" maxWidth="480px">
        <div className="flex items-center justify-end -mt-1">
          <button type="button" onClick={markAllRead} className="text-[13px] font-semibold text-primary cursor-pointer">
            Mark all read
          </button>
        </div>
        <div className="flex flex-col gap-2 overflow-y-auto">
          {loading && <div className="py-6 text-center text-xs text-muted">Loading…</div>}
          {!loading &&
            notifications?.map((n) => {
              const accent = notifAccent(n.title);
              return (
                <Link
                  key={n.id}
                  href={n.sampleId ? `/samples/${n.sampleId}` : "/notifications"}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 items-start rounded-2xl shadow-card-sm p-3.5 border"
                  style={{
                    background: n.unread ? "#FFFFFF" : "#FAFCFD",
                    borderColor: n.unread ? "#D6E4EC" : "#EEF2F5",
                  }}
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
          {!loading && notifications?.length === 0 && <EmptyState>No notifications yet.</EmptyState>}
        </div>
      </Modal>
    </>
  );
}
