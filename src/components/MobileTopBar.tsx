import Image from "next/image";
import Link from "next/link";

/** Minimal mobile-only brand bar: logo + alerts. Primary navigation stays in BottomNav. */
export default function MobileTopBar({ hasUnread }: { hasUnread: boolean }) {
  return (
    <div className="md:hidden flex items-center justify-between bg-white border-b border-border px-5 h-12 shrink-0">
      <Image src="/zekindo-logo.png" alt="Zekindo" width={92} height={20} style={{ height: 20, width: "auto" }} priority />
      <Link href="/notifications" className="relative w-8 h-8 -mr-1.5 flex items-center justify-center shrink-0" aria-label="Alerts">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#3D4653" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {hasUnread && (
          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger border-[1.5px] border-white" />
        )}
      </Link>
    </div>
  );
}
