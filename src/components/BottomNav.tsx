import Link from "next/link";

type Tab = "home" | "samples" | "scan" | "notif" | "profile";

const ON = "#2B8DB8";
const OFF = "#A0B4BF";

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
    </svg>
  );
}

function ScanIcon({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8V5a1 1 0 011-1h3" />
      <path d="M20 8V5a1 1 0 00-1-1h-3" />
      <path d="M4 16v3a1 1 0 001 1h3" />
      <path d="M20 16v3a1 1 0 01-1 1h-3" />
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

export default function BottomNav({ active, hasUnread }: { active: Tab; hasUnread: boolean }) {
  const c = (tab: Tab) => (active === tab ? ON : OFF);
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-border flex items-start justify-around pt-2 px-1 pb-[max(env(safe-area-inset-bottom),14px)] z-10">
      <Link href="/dashboard" className="flex flex-col items-center gap-[3px] w-14">
        <HomeIcon color={c("home")} />
        <span className="text-[10px] font-semibold" style={{ color: c("home") }}>
          Home
        </span>
      </Link>
      <Link href="/samples" className="flex flex-col items-center gap-[3px] w-14">
        <SamplesIcon color={c("samples")} />
        <span className="text-[10px] font-semibold" style={{ color: c("samples") }}>
          Samples
        </span>
      </Link>
      <Link href="/scan" className="flex flex-col items-center gap-0.5 w-14 -mt-3.5">
        <div className="w-[46px] h-[46px] rounded-full bg-primary flex items-center justify-center shadow-[0_4px_10px_rgba(43,141,184,0.35)]">
          <ScanIcon color="#fff" />
        </div>
        <span className="text-[10px] font-semibold text-primary mt-0.5">Scan</span>
      </Link>
      <Link href="/notifications" className="flex flex-col items-center gap-[3px] w-14">
        <div className="relative">
          <BellIcon color={c("notif")} />
          {hasUnread && (
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-danger border-[1.5px] border-white" />
          )}
        </div>
        <span className="text-[10px] font-semibold" style={{ color: c("notif") }}>
          Alerts
        </span>
      </Link>
      <Link href="/profile" className="flex flex-col items-center gap-[3px] w-14">
        <ProfileIcon color={c("profile")} />
        <span className="text-[10px] font-semibold" style={{ color: c("profile") }}>
          Profile
        </span>
      </Link>
    </div>
  );
}
