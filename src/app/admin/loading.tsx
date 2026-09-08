import { SidebarSkeleton, SkeletonBlock } from "@/components/Skeleton";

// Loading state for the Lab Management hub (/admin) — mirrors the card-grid
// layout: Insights / Catalog & Inventory / Administration sections each with
// rows of settings links, so navigation never flashes an empty page.
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)]">
      <SidebarSkeleton />
      <div className="md:hidden flex items-center gap-3 px-4 py-3.5 border-b border-border bg-white">
        <SkeletonBlock className="h-10 w-10 rounded-full" />
        <SkeletonBlock className="h-4 w-32" />
      </div>
      <div className="hidden md:block sticky top-0 bg-white border-b border-border px-8 pt-10 pb-4 z-10">
        <SkeletonBlock className="h-6 w-44" />
      </div>
      <div className="flex-1 px-5 md:px-8 pt-4.5 pb-7 flex flex-col gap-5 md:grid md:grid-cols-3 md:gap-4 md:items-start md:max-w-[1100px] md:w-full">
        {Array.from({ length: 3 }).map((_, col) => (
          <div key={col} className="flex flex-col gap-2.5">
            <SkeletonBlock className="h-3 w-32" />
            <div className="bg-white border border-border rounded-[18px] shadow-card overflow-hidden">
              {Array.from({ length: 5 }).map((_, row) => (
                <div
                  key={row}
                  className={`flex items-center justify-between px-4 min-h-[52px] ${
                    row < 4 ? "border-b border-border-soft" : ""
                  }`}
                >
                  <SkeletonBlock className="h-3.5 w-36" />
                  <SkeletonBlock className="h-3 w-3" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
