import Image from "next/image";
import Link from "next/link";

/** Slim mobile-only utility bar: logo + alerts. Primary navigation stays in BottomNav; the Dashboard uses its own colored hero header instead. */
export default function MobileTopBar({ unreadCount }: { unreadCount: number }) {
  const hasUnread = unreadCount > 0;
  return (
    <div className="md:hidden flex items-center justify-between bg-white border-b border-border px-5 h-12 shrink-0">
      <Image src="/zekindo-logo.png" alt="Zekindo" width={60} height={20} style={{ height: 20, width: "auto" }} priority />
      <Link
        href="/notifications"
        aria-label="Alerts"
        className="relative w-8 h-8 -mr-1.5 flex items-center justify-center shrink-0 rounded-full hover:bg-chip-bg transition-colors"
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
  );
}
