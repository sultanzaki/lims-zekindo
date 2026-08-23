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

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const chars = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  return chars || "?";
}

/** Mobile-only colored hero header for the Dashboard: greeting + avatar + alerts. */
export default function DashboardMobileHeader({ unreadCount, userName }: { unreadCount: number; userName: string }) {
  const hasUnread = unreadCount > 0;
  const greeting = useSyncExternalStore(subscribeNoop, getGreetingSnapshot, getGreetingServerSnapshot);
  const firstName = userName.trim().split(/\s+/)[0] ?? userName;

  return (
    <div
      className="md:hidden px-5 pt-6 pb-11 rounded-b-[28px] shrink-0"
      style={{ background: "linear-gradient(135deg, #1A5F7A 0%, #2B8DB8 100%)" }}
    >
      <div className="flex items-center justify-between">
        <Link href="/profile" className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-[14px] font-bold text-white shrink-0">
            {initialsFrom(userName)}
          </div>
          <div className="min-w-0">
            <div
              className="text-[12px] text-white/70 leading-none transition-opacity duration-300"
              style={{ opacity: greeting ? 1 : 0 }}
            >
              {greeting}
            </div>
            <div className="text-[17px] font-bold text-white leading-tight truncate mt-1">{firstName}</div>
          </div>
        </Link>

        <Link
          href="/notifications"
          aria-label="Alerts"
          className="relative w-10 h-10 flex items-center justify-center shrink-0 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
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
