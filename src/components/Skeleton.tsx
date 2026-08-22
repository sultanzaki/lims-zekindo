export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`bg-chip-bg rounded-lg animate-pulse ${className}`} />;
}

export function SkeletonRow({ withBadge = true }: { withBadge?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 bg-white border border-border rounded-xl p-3.5">
      <div className="flex-1 flex flex-col gap-1.5">
        <SkeletonBlock className="h-3.5 w-28" />
        <SkeletonBlock className="h-3 w-40" />
      </div>
      {withBadge && <SkeletonBlock className="h-5 w-20 rounded-full" />}
    </div>
  );
}

export function TabScreenSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <div className="px-5 pt-6 pb-3.5 bg-white border-b border-border flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-5 w-32" />
        </div>
        <SkeletonBlock className="h-10 w-10 rounded-full" />
      </div>
      <div className="flex-1 p-5 flex flex-col gap-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <div className="px-5 pt-6 pb-3.5 bg-white border-b border-border flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-5 w-32" />
        </div>
        <SkeletonBlock className="h-10 w-10 rounded-full" />
      </div>
      <div className="flex-1 p-5 flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonRow key={i} withBadge={false} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DetailScreenSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
        <SkeletonBlock className="h-8 w-8 rounded-full" />
        <SkeletonBlock className="h-4 w-28" />
      </div>
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-3 w-52" />
          <SkeletonBlock className="h-5 w-24 rounded-full" />
        </div>
        <SkeletonBlock className="h-32 w-full rounded-xl" />
        <SkeletonBlock className="h-24 w-full rounded-xl" />
        <SkeletonBlock className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function FormScreenSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
        <SkeletonBlock className="h-8 w-8 rounded-full" />
        <SkeletonBlock className="h-4 w-28" />
      </div>
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
