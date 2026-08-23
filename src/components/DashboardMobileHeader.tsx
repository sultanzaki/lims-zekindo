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

/** Mobile-only Dashboard header: light, flush, productivity-app style — bold greeting + soft avatar, no solid color block. */
export default function DashboardMobileHeader({ unreadCount, userName }: { unreadCount: number; userName: string }) {
  const hasUnread = unreadCount > 0;
  const greeting = useSyncExternalStore(subscribeNoop, getGreetingSnapshot, getGreetingServerSnapshot);
  const firstName = userName.trim().split(/\s+/)[0] ?? userName;

  return (
    <div className="md:hidden relative overflow-hidden bg-white px-5 pt-6 pb-5 shrink-0">
      <div
        className="absolute -top-14 -right-10 w-44 h-44 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(43,141,184,0.14) 0%, rgba(43,141,184,0) 72%)" }}
      />
      <div className="relative flex items-center justify-between">
        <Link href="/profile" className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center text-[15px] font-bold text-primary-dark shrink-0">
            {initialsFrom(userName)}
          </div>
          <div className="min-w-0">
            <div
              className="text-[12.5px] text-muted leading-none transition-opacity duration-300"
              style={{ opacity: greeting ? 1 : 0 }}
            >
              {greeting}
            </div>
            <div className="text-[19px] font-bold text-text leading-tight truncate mt-1">{firstName}</div>
          </div>
        </Link>

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
