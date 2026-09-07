"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { GlobalSearchMobileButton } from "@/components/GlobalSearch";

function subscribeNoop() {
  return () => {};
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
function getGreetingServerSnapshot() {
  return null;
}

/**
 * Dashboard header — fully transparent, no background of its own, so it sits
 * directly on the page's own bg-page-bg and reads as ONE surface with the
 * content below (true seamless). The greeting is the only "decoration";
 * action buttons are frosted chips that float on the page background.
 */
export function DashboardHeaderDesktop({ userName }: { userName: string }) {
  const greeting = useSyncExternalStore(subscribeNoop, getGreeting, getGreetingServerSnapshot);
  const firstName = userName.trim().split(/\s+/)[0] ?? userName;
  const date = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="hidden md:block shrink-0">
      <div className="px-9 pt-9 pb-2">
        <h1 className="text-[20px] font-bold text-[#11303D] tracking-tight">Dashboard</h1>
        <div className="text-[13px] text-[#5B6B74] mt-1">
          {greeting}, <span className="font-semibold text-[#11303D]">{firstName}</span> &middot; {date}
        </div>
      </div>
    </div>
  );
}

export default function DashboardMobileHeader({ unreadCount, userName }: { unreadCount: number; userName: string }) {
  const hasUnread = unreadCount > 0;
  const greeting = useSyncExternalStore(subscribeNoop, getGreeting, getGreetingServerSnapshot);
  const firstName = userName.trim().split(/\s+/)[0] ?? userName;
  const date = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="md:hidden relative shrink-0">
      <div className="relative flex items-start justify-between gap-3 px-5 pt-7 pb-2">
        <div className="min-w-0">
          <div
            className="text-[22px] font-bold text-[#11303D] leading-tight truncate transition-opacity duration-300"
            style={{ opacity: greeting ? 1 : 0 }}
          >
            {greeting}, {firstName}
          </div>
          <div className="text-[12px] font-medium text-[#5B6B74] mt-0.5">{date}</div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <GlobalSearchMobileButton />
          <Link
            href="/notifications"
            aria-label="Alerts"
            className="relative w-10 h-10 flex items-center justify-center shrink-0 rounded-full bg-white border border-border text-muted hover:bg-surface-alt hover:text-text shadow-card-sm transition-colors"
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
    </div>
  );
}
