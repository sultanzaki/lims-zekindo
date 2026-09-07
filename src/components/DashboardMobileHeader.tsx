"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { GlobalSearchMobileButton } from "@/components/GlobalSearch";

function subscribeNoop() {
  return () => {};
}

type PartOfDay = "morning" | "afternoon" | "evening";
function getPartOfDay(): PartOfDay {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}
function getSnapshot() {
  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";
  const date = now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  return `${getPartOfDay()}|${greeting}|${date}`;
}
function getServerSnapshot() {
  return null;
}

// Refined header treatment: NO loud atmospheric gradients. Instead a calm,
// on-brand wash built from the app's own navy/blue accents (#2B8DB8 →
// #1A5F7A) that deepens subtly by time of day (morning = lighter & airier,
// evening = deeper & dusk-like), always staying in the same blue family so
// it reads as part of the product, not a weather-app banner. Dark navy text
// everywhere for contrast; white content cards below transition cleanly via
// the page's existing bg-page-bg.
const TONES: Record<PartOfDay, { from: string; to: string; via: string; label: string }> = {
  morning: {
    from: "#EAF5FB",
    via: "#D4EAF7",
    to: "#F7FBFD",
    label: "Morning",
  },
  afternoon: {
    from: "#E0F0F9",
    via: "#C4E2F2",
    to: "#F2F8FB",
    label: "Afternoon",
  },
  evening: {
    from: "#DCE9F4",
    via: "#B9D4EA",
    to: "#EDF4F9",
    label: "Evening",
  },
};

function SkyBackdrop({ part }: { part: PartOfDay }) {
  const t = TONES[part];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* calm brand wash */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(120deg, ${t.from} 0%, ${t.via} 45%, ${t.to} 100%)` }}
      />
      {/* soft radial accent top-right — very subtle, no hard disc */}
      <div
        className="absolute rounded-full"
        style={{
          width: 420,
          height: 420,
          right: -120,
          top: -180,
          background: `radial-gradient(circle, rgba(43,141,184,0.14) 0%, transparent 65%)`,
        }}
      />
      {/* hairline bottom border for a crisp transition to page bg */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-border" />
    </div>
  );
}

/**
 * Dashboard header (shared visual by mobile & desktop): calm on-brand blue
 * wash that shifts subtly with the time of day, dark navy ink, crisp
 * hairline divider — reads as part of the LIMS, not a decorative banner.
 */
export function DashboardHeaderDesktop({ userName }: { userName: string }) {
  const snapshot = useSyncExternalStore(subscribeNoop, getSnapshot, getServerSnapshot);
  const [part, greeting, date] = snapshot ? snapshot.split("|") : ["afternoon", "", ""];
  const t = TONES[(part as PartOfDay) ?? "afternoon"];
  const firstName = userName.trim().split(/\s+/)[0] ?? userName;

  return (
    <div className="hidden md:block sticky top-0 z-10">
      <div className="relative overflow-hidden px-9 pt-9 pb-5">
        <SkyBackdrop part={(part as PartOfDay) ?? "afternoon"} />
        <div className="relative">
          <h1 className="text-[20px] font-bold text-[#11303D] tracking-tight">Dashboard</h1>
          <div className="text-[13px] text-[#3D6377] mt-1">
            {greeting}, <span className="font-semibold text-[#11303D]">{firstName}</span> &middot; {date}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardMobileHeader({ unreadCount, userName }: { unreadCount: number; userName: string }) {
  const hasUnread = unreadCount > 0;
  const part = useSyncExternalStore(subscribeNoop, getPartOfDay, () => "afternoon" as PartOfDay);
  const greeting = useSyncExternalStore(
    subscribeNoop,
    () => (new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening"),
    () => ""
  );
  const firstName = userName.trim().split(/\s+/)[0] ?? userName;

  return (
    <div className="md:hidden relative shrink-0 overflow-hidden">
      <SkyBackdrop part={part} />
      <div className="relative flex items-start justify-between gap-3 px-5 pt-7 pb-5">
        <div className="min-w-0">
          <div
            className="text-[22px] font-bold text-[#11303D] leading-tight truncate transition-opacity duration-300"
            style={{ opacity: greeting ? 1 : 0 }}
          >
            {greeting}, {firstName}
          </div>
          <div className="text-[12px] font-medium text-[#3D6377] mt-0.5">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <GlobalSearchMobileButton />
          <Link
            href="/notifications"
            aria-label="Alerts"
            className="relative w-10 h-10 flex items-center justify-center shrink-0 rounded-full bg-white/70 hover:bg-white transition-colors"
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
