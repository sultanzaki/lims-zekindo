import { SidebarSkeleton, SkeletonBlock, SkeletonRow } from "@/components/Skeleton";

// Loading state for the TAT Calendar — mirrors CalendarClient's two-pane
// layout: month grid card (left / top) + selected-day list (right/below).
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)]">
      <SidebarSkeleton />
      <div className="md:hidden flex items-center gap-3 px-4 py-3.5 border-b border-border bg-white">
        <SkeletonBlock className="h-10 w-10 rounded-full" />
        <SkeletonBlock className="h-4 w-28" />
      </div>
      <div className="hidden md:block px-9 pt-7">
        <SkeletonBlock className="h-6 w-36" />
        <SkeletonBlock className="h-3 w-56 mt-1" />
      </div>
      <div className="flex-1 px-5 md:px-9 pt-4.5 md:pt-5 pb-7 flex flex-col gap-4 md:grid md:grid-cols-[400px_1fr] md:gap-6 md:items-start md:max-w-[1080px] md:w-full">
        {/* Month calendar card */}
        <div className="bg-white border border-border rounded-[18px] md:rounded-2xl shadow-card p-4 md:p-5">
          <SkeletonBlock className="h-5 w-36 mx-auto" />
          <div className="grid grid-cols-7 gap-1 md:gap-1.5 mt-4">
            {Array.from({ length: 35 }).map((_, i) => (
              <SkeletonBlock key={i} className="aspect-square w-full rounded-[10px]" />
            ))}
          </div>
          <div className="flex gap-4 mt-4 pt-3 border-t border-border-soft">
            <SkeletonBlock className="h-3 w-16" />
            <SkeletonBlock className="h-3 w-12" />
          </div>
        </div>
        {/* Day list */}
        <div className="flex flex-col gap-2 md:gap-2.5 w-full">
          <SkeletonBlock className="h-5 w-40" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} withBadge={false} stagger={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
