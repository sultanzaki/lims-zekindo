import { SidebarSkeleton, SkeletonBlock, SkeletonRow } from "@/components/Skeleton";

// Loading state for the Plant Stock list page — mirrors its real layout:
// desktop title/toolbar, mobile header handled by the shell, period
// selector, filters, stat strip, then a list of card/row skeletons.
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)]">
      <SidebarSkeleton />
      <div className="md:hidden flex items-center gap-3 px-4 py-3.5 border-b border-border bg-white">
        <SkeletonBlock className="h-10 w-10 rounded-full" />
        <SkeletonBlock className="h-4 w-28" />
      </div>
      {/* Desktop title bar (matches BackHeader hideDesktop + page header) */}
      <div className="hidden md:block">
        <div className="flex items-start justify-between px-9 pt-7 pr-10">
          <div className="flex flex-col gap-1.5">
            <SkeletonBlock className="h-6 w-40" />
            <SkeletonBlock className="h-3 w-64" />
          </div>
          <div className="flex gap-2.5">
            <SkeletonBlock className="h-[38px] w-28 rounded-[10px]" />
            <SkeletonBlock className="h-[38px] w-36 rounded-[10px]" />
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 md:px-9 pt-4.5 md:pt-6 pb-7 md:pb-9 flex flex-col gap-3.5 md:gap-5 md:max-w-[1400px] md:w-full">
        {/* Period selector */}
        <SkeletonBlock className="h-[42px] md:h-[34px] w-full md:w-[420px] rounded-[10px]" />
        {/* Filters */}
        <SkeletonBlock className="h-[42px] md:h-[38px] w-full md:w-[260px] rounded-[10px]" />
        {/* Stat strip */}
        <div className="hidden md:grid md:grid-cols-4 md:gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-[62px] w-full rounded-[14px]" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:hidden">
          {Array.from({ length: 2 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-[62px] w-full rounded-[14px]" />
          ))}
        </div>
        {/* List rows */}
        <div className="flex flex-col gap-2.5 md:hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} withBadge={false} stagger={i} />
          ))}
        </div>
        <div className="hidden md:flex md:flex-col md:gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRow key={i} withBadge={false} stagger={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
