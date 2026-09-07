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

// Sky gradients tuned for the lab palette — warm sunrise/sunset hues that
// stay medium-light so a single dark-ink foreground (#11303D / #1A5F7A,
// matching the app's text/navy) reads crisply on ALL variants. No white-on-
// light pitfalls, and it stays on-brand with the lab's navy/blue accents.
const SKY: Record<PartOfDay, { base: string; sun: string; glow: string; label: string }> = {
  morning: {
    base: "linear-gradient(120deg, #FFD9A0 0%, #FFC98A 25%, #FFBB73 50%, #FFD9A0 78%, #FFF0CF 100%)",
    sun: "#FFC987",
    glow: "rgba(255, 190, 120, 0.55)",
    label: "Sunrise",
  },
  afternoon: {
    base: "linear-gradient(120deg, #BFE0F5 0%, #A9D3EF 28%, #9ACBEA 55%, #B8DDF3 80%, #DDF0FA 100%)",
    sun: "#FFF3C4",
    glow: "rgba(255, 243, 196, 0.8)",
    label: "Daylight",
  },
  evening: {
    base: "linear-gradient(120deg, #F6B0C0 0%, #F29AA8 25%, #EFA48F 50%, #F6C3A5 80%, #FFE3CE 100%)",
    sun: "#FFB08C",
    glow: "rgba(255, 176, 140, 0.5)",
    label: "Sunset",
  },
};

function SkyBackdrop({ part }: { part: PartOfDay }) {
  const sky = SKY[part];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* base sky gradient */}
      <div className="absolute inset-0" style={{ background: sky.base }} />
      {/* sun disc */}
      <div
        className="absolute rounded-full"
        style={{
          width: 150,
          height: 150,
          right: -18,
          top: -58,
          background: `radial-gradient(circle, ${sky.sun} 0%, ${sky.sun} 35%, transparent 72%)`,
          opacity: 0.9,
        }}
      />
      {/* soft glow under the sun — wide & smooth so no hard edge shows */}
      <div
        className="absolute rounded-full"
        style={{
          width: 380,
          height: 380,
          right: -80,
          top: -110,
          background: `radial-gradient(circle, ${sky.glow} 0%, transparent 62%)`,
        }}
      />
      {/* horizon haze line */}
      <div
        className="absolute inset-x-0 bottom-0 h-10"
        style={{ background: "linear-gradient(to top, rgba(255,255,255,0.5), transparent)" }}
      />
    </div>
  );
}

/**
 * Dashboard hero banner — a warm sunrise/sunset gradient that changes with
 * the time of day (fresh peach sunrise in the morning, soft blue daylight in
 * the afternoon, rose/amber sunset in the evening). White text sits on the
 * gradient with a subtle drop shadow so it stays readable over any sky tone.
 * Desktop gets the same backdrop but with the standard title layout.
 */
export function DashboardSunriseHero({ userName }: { userName: string }) {
  const snapshot = useSyncExternalStore(subscribeNoop, getSnapshot, getServerSnapshot);
  const [part, greeting, date] = snapshot ? snapshot.split("|") : ["morning", "", ""];
  const sky = SKY[(part as PartOfDay) ?? "morning"];
  const firstName = userName.trim().split(/\s+/)[0] ?? userName;

  return (
    <div className="hidden md:block sticky top-0 z-10 px-0">
      <div className="relative overflow-hidden rounded-b-[26px] px-8 pt-10 pb-9">
        <SkyBackdrop part={(part as PartOfDay) ?? "morning"} />
        <div className="relative">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "rgba(26,95,122,0.9)" }}>
            {sky.label}
          </div>
          <h1 className="text-[22px] font-bold tracking-tight mt-1" style={{ color: "#11303D" }}>
            Dashboard
          </h1>
          <div className="text-[13.5px] font-medium mt-1" style={{ color: "rgba(17,48,61,0.82)" }}>
            {greeting}, <span className="font-semibold" style={{ color: "#11303D" }}>{firstName}</span> &middot; {date}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile dashboard hero — same sky gradient family, full-bleed width, with
 * the greeting/name prominent and the alert/search actions floating on the
 * right.
 */
export default function DashboardMobileHeader({ unreadCount, userName }: { unreadCount: number; userName: string }) {
  const hasUnread = unreadCount > 0;
  const part = useSyncExternalStore(subscribeNoop, getPartOfDay, () => "morning" as PartOfDay);
  const greeting = useSyncExternalStore(
    subscribeNoop,
    () => (new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening"),
    () => ""
  );
  const sky = SKY[part];
  const firstName = userName.trim().split(/\s+/)[0] ?? userName;

  return (
    <div className="md:hidden relative shrink-0 overflow-hidden">
      <SkyBackdrop part={part} />
      <div className="relative flex items-start justify-between gap-3 px-5 pt-8 pb-7">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "rgba(26,95,122,0.9)" }}>
            {sky.label}
          </div>
          <div
            className="text-[24px] font-bold leading-tight truncate mt-1 transition-opacity duration-300"
            style={{ color: "#11303D", opacity: greeting ? 1 : 0 }}
          >
            {greeting}, {firstName}
          </div>
          <div className="text-[11.5px] font-medium mt-0.5" style={{ color: "rgba(17,48,61,0.72)" }}>
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <GlobalSearchMobileButton />
          <Link
            href="/notifications"
            aria-label="Alerts"
            className="relative w-10 h-10 flex items-center justify-center shrink-0 rounded-full transition-colors"
            style={{ background: "rgba(255,255,255,0.5)" }}
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
