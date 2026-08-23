"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

function subscribeNoop() {
  return () => {};
}
function getGreetingSnapshot() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
function getGreetingServerSnapshot() {
  return null;
}

/**
 * Mobile-only Dashboard header: transparent, so it's truly seamless with the page background —
 * bold greeting on a soft gradient accent, no avatar, no solid color block.
 * The decorative blob lives in its own tall clipping box so its soft fade completes before any
 * edge would cut it off (a tightly-sized overflow-hidden box was clipping it mid-fade, which read
 * as a hard boundary against the content below).
 */
export default function DashboardMobileHeader({ unreadCount, userName }: { unreadCount: number; userName: string }) {
  const hasUnread = unreadCount > 0;
  const greeting = useSyncExternalStore(subscribeNoop, getGreetingSnapshot, getGreetingServerSnapshot);
  const firstName = userName.trim().split(/\s+/)[0] ?? userName;

  return (
    <div className="md:hidden relative shrink-0">
      <div className="absolute inset-x-0 top-0 h-[220px] overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute -top-16 -right-14 w-56 h-56 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(43,141,184,0.16) 0%, rgba(43,141,184,0) 70%)" }}
        />
      </div>
      <div className="relative flex items-start justify-between gap-3 px-5 pt-7 pb-6">
        <div className="min-w-0">
          <div
            className="text-[13px] text-muted leading-none transition-opacity duration-300"
            style={{ opacity: greeting ? 1 : 0 }}
          >
            {greeting}
          </div>
          <div className="text-[23px] font-bold text-text leading-tight truncate mt-1.5">{firstName}</div>
        </div>

        <Link
          href="/notifications"
          aria-label="Alerts"
          className="relative w-10 h-10 flex items-center justify-center shrink-0 rounded-full bg-chip-bg hover:bg-border transition-colors"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#1A5F7A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          {hasUnread && (
            <div className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-danger border-[1.5px] border-white flex items-center justify-center text-[8px] font-bold text-white leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </div>
          )}
        </Link>
      </div>
    </div>
  );
}
