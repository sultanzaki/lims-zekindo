import Link from "next/link";

export default function BackHeader({ title, backHref }: { title: string; backHref: string }) {
  return (
    <div className="sticky top-0 bg-white border-b border-border flex items-center gap-3 px-4 py-3.5 z-10">
      <Link
        href={backHref}
        className="w-8 h-8 rounded-full bg-chip-bg flex items-center justify-center shrink-0"
        aria-label="Back"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2B8DB8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </Link>
      <div className="text-[17px] font-bold text-text">{title}</div>
    </div>
  );
}
