import { SkeletonBlock } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="h-dvh flex flex-col overflow-y-auto overscroll-contain bg-surface">
      <div className="px-5 pt-6 pb-3 bg-white border-b border-border">
        <SkeletonBlock className="h-5 w-24" />
      </div>
      <div className="flex-1 p-5 flex flex-col gap-5">
        <SkeletonBlock className="h-20 w-full rounded-2xl" />
        <SkeletonBlock className="h-32 w-full rounded-2xl" />
        <SkeletonBlock className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}
