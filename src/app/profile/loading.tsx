import { SkeletonBlock, SidebarSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-surface md:pl-[var(--sidebar-w)]">
      <SidebarSkeleton />
      <div className="px-5 md:px-8 pt-6 md:pt-10 pb-3 md:pb-4 bg-white border-b border-border">
        <div className="md:max-w-[640px] md:w-full">
          <SkeletonBlock className="h-5 md:h-6 w-24" />
        </div>
      </div>
      <div className="flex-1 p-5 md:px-8 md:py-6 flex flex-col gap-5 md:max-w-[640px] md:w-full">
        <SkeletonBlock className="h-20 w-full rounded-2xl" />
        <SkeletonBlock className="h-32 w-full rounded-2xl" />
        <SkeletonBlock className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}
