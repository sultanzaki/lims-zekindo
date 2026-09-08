import { SidebarSkeleton, SkeletonBlock, SkeletonRow } from "@/components/Skeleton";

// Loading state for Advanced Insights — a single-column stack of sections
// (label + note + list rows), narrow max-width, no charts.
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)]">
      <SidebarSkeleton />
      <div className="md:hidden flex items-center gap-3 px-4 py-3.5 border-b border-border bg-white">
        <SkeletonBlock className="h-10 w-10 rounded-full" />
        <SkeletonBlock className="h-4 w-36" />
      </div>
      <div className="hidden md:block sticky top-0 bg-white border-b border-border px-8 pt-10 pb-4 z-10">
        <SkeletonBlock className="h-6 w-44" />
      </div>
      <div className="flex-1 px-5 md:px-8 pt-4.5 pb-7 flex flex-col gap-6 md:max-w-[720px] md:w-full">
        {Array.from({ length: 3 }).map((_, section) => (
          <div key={section} className="flex flex-col gap-2">
            <SkeletonBlock className="h-4 w-52" />
            <SkeletonBlock className="h-3 w-full max-w-[560px]" />
            <div className="mt-1 flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, row) => (
                <SkeletonRow key={row} withBadge={false} stagger={row} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
