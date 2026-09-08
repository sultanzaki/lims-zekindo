import { SidebarSkeleton, SkeletonBlock } from "@/components/Skeleton";

// Loading state for the Analytics page — mirrors its dense dashboard layout:
// export bar, KPI tiles, then a 2-column grid of chart cards. This page runs
// ~10 aggregate queries so a layout-shaped skeleton prevents a long blank.
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)]">
      <SidebarSkeleton />
      <div className="md:hidden flex items-center gap-3 px-4 py-3.5 border-b border-border bg-white">
        <SkeletonBlock className="h-10 w-10 rounded-full" />
        <SkeletonBlock className="h-4 w-24" />
      </div>
      <div className="hidden md:block sticky top-0 bg-white border-b border-border px-8 pt-10 pb-4 z-10">
        <SkeletonBlock className="h-6 w-32" />
      </div>
      <div className="flex-1 px-5 md:px-8 pt-4.5 pb-7 flex flex-col gap-3.5 md:max-w-[1100px] md:w-full">
        {/* Export bar */}
        <SkeletonBlock className="h-[46px] w-full rounded-2xl" />
        {/* KPI tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-[84px] w-full rounded-[16px]" />
          ))}
        </div>
        {/* Chart cards grid */}
        <div className="flex flex-col gap-3.5 md:grid md:grid-cols-2 md:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-[240px] w-full rounded-[16px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
