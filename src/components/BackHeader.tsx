import Link from "next/link";

export default function BackHeader({
  title,
  backHref,
  hideDesktop = false,
}: {
  title: string;
  backHref: string;
  hideDesktop?: boolean;
}) {
  return (
    <>
      <div className="no-print md:hidden sticky top-0 bg-white border-b border-border flex items-center gap-3 px-4 py-3.5 z-10">
        <Link
          href={backHref}
          className="w-10 h-10 rounded-full bg-chip-bg border border-border flex items-center justify-center shrink-0"
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A5F7A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="text-[16px] font-bold text-text tracking-tight">{title}</div>
      </div>

      {/* Desktop: navigation lives in the sidebar, so no back button — just the page title.
          Pages with their own richer desktop header (title+subtitle+toolbar) set hideDesktop. */}
      {!hideDesktop && (
        <div className="hidden md:block sticky top-0 bg-white border-b border-border px-8 pt-10 pb-4 z-10">
          <h1 className="text-[19px] font-bold text-text tracking-tight">{title}</h1>
        </div>
      )}
    </>
  );
}
