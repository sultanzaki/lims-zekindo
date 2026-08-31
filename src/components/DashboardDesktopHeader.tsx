"use client";

import { useSyncExternalStore } from "react";

function subscribeNoop() {
  return () => {};
}
function getSnapshot() {
  const now = new Date();
  const h = now.getHours();
  const greeting = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const date = now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  return `${greeting}|${date}`;
}
function getServerSnapshot() {
  return null;
}

export default function DashboardDesktopHeader({ userName }: { userName: string }) {
  const snapshot = useSyncExternalStore(subscribeNoop, getSnapshot, getServerSnapshot);
  const [greeting, date] = snapshot ? snapshot.split("|") : ["", ""];

  return (
    <div className="hidden md:block sticky top-0 bg-white border-b border-border px-8 pt-10 pb-4 z-10">
      <h1 className="text-[19px] font-bold text-text tracking-tight">Dashboard</h1>
      <div className="text-[13px] text-muted mt-1 transition-opacity duration-300" style={{ opacity: snapshot ? 1 : 0 }}>
        {greeting}, <span className="font-semibold text-text">{userName}</span> &middot; {date}
      </div>
    </div>
  );
}
