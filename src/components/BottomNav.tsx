"use client";

import Link, { useLinkStatus } from "next/link";

type Tab = "home" | "samples" | "scan" | "notif" | "profile";

const ON = "#1A5F7A";
const OFF = "#93A6B0";
const PILL = "#E8F4FA";

function HomeIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function SamplesIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6" />
      <path d="M9 3v6l-4 9h14l-4-9V3" />
      <path d="M7.5 15h9" />
    </svg>
  );
}

function ScanIcon({ color }: { color: string }) {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8V5a1 1 0 011-1h3" />
      <path d="M20 8V5a1 1 0 00-1-1h-3" />
      <path d="M4 16v3a1 1 0 001 1h3" />
      <path d="M20 16v3a1 1 0 01-1 1h-3" />
      <path d="M4 12h16" />
    </svg>
  );
}

function BellIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a8 8 0 0116 0v1" />
    </svg>
  );
}

/** Renders inside a Link — dims the tab instantly on tap, before the new page arrives. */
function TapFeedback({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <div className={`flex flex-col items-center gap-[3px] transition-opacity duration-150 ${pending ? "opacity-40" : "opacity-100"}`}>
      {children}
    </div>
  );
}

function NavPill({ children, on }: { children: React.ReactNode; on: boolean }) {
  return (
    <div className="rounded-full px-4 py-1.5 flex transition-colors" style={{ background: on ? PILL : "transparent" }}>
      {children}
    </div>
  );
}

export default function BottomNav({ active, unreadCount }: { active: Tab; unreadCount: number }) {
  const c = (tab: Tab) => (active === tab ? ON : OFF);
  const hasUnread = unreadCount > 0;
  return (
    <div className="no-print md:hidden sticky bottom-0 left-0 right-0 bg-white border-t border-border flex items-stretch justify-around pt-1.5 px-1 pb-[max(env(safe-area-inset-bottom),20px)] shadow-[0_-2px_14px_rgba(16,42,58,0.06)] z-10">
      <Link href="/dashboard" className="flex flex-col items-center flex-1 min-h-12 pt-1">
        <TapFeedback>
          <NavPill on={active === "home"}>
            <HomeIcon color={c("home")} />
          </NavPill>
          <span className="text-[11px] font-semibold" style={{ color: c("home") }}>
            Home
          </span>
        </TapFeedback>
      </Link>
      <Link href="/samples" className="flex flex-col items-center flex-1 min-h-12 pt-1">
        <TapFeedback>
          <NavPill on={active === "samples"}>
            <SamplesIcon color={c("samples")} />
          </NavPill>
          <span className="text-[11px] font-semibold" style={{ color: c("samples") }}>
            Samples
          </span>
        </TapFeedback>
      </Link>
      <Link href="/scan" className="flex flex-col items-center flex-1 -mt-4">
        <TapFeedback>
          <div className="w-[50px] h-[50px] rounded-full bg-primary flex items-center justify-center shadow-[0_6px_14px_rgba(43,141,184,0.4)] border-[3px] border-white">
            <ScanIcon color="#fff" />
          </div>
          <span className="text-[11px] font-semibold text-primary mt-0.5">Scan</span>
        </TapFeedback>
      </Link>
      <Link href="/notifications" className="flex flex-col items-center flex-1 min-h-12 pt-1">
        <TapFeedback>
          <div className="relative">
            <NavPill on={active === "notif"}>
              <BellIcon color={c("notif")} />
            </NavPill>
            {hasUnread && (
              <div className="absolute -top-0.5 right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger border-[2px] border-white flex items-center justify-center text-[9px] font-bold text-white leading-none">
                {unreadCount > 99 ? "99+" : unreadCount}
              </div>
            )}
          </div>
          <span className="text-[11px] font-semibold" style={{ color: c("notif") }}>
            Alerts
          </span>
        </TapFeedback>
      </Link>
      <Link href="/profile" className="flex flex-col items-center flex-1 min-h-12 pt-1">
        <TapFeedback>
          <NavPill on={active === "profile"}>
            <ProfileIcon color={c("profile")} />
          </NavPill>
          <span className="text-[11px] font-semibold" style={{ color: c("profile") }}>
            Profile
          </span>
        </TapFeedback>
      </Link>
    </div>
  );
}
