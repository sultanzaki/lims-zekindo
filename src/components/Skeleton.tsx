export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export function SkeletonRow({ withBadge = true, stagger = 0 }: { withBadge?: boolean; stagger?: number }) {
  return (
    <div
      className="stagger-item flex items-center gap-2.5 bg-white border border-border rounded-[18px] p-3.5"
      style={{ "--stagger": stagger } as React.CSSProperties}
    >
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
    <div className="min-h-screen flex flex-col bg-page-bg">
      <div className="px-5 pt-6 pb-4 bg-white border-b border-border flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-5 w-32" />
        </div>
        <SkeletonBlock className="h-10 w-10 rounded-full" />
      </div>
      <div className="flex-1 p-5 flex flex-col gap-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} stagger={i} />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-page-bg">
      <div className="px-5 pt-6 pb-4 bg-white border-b border-border flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-5 w-32" />
        </div>
        <SkeletonBlock className="h-10 w-10 rounded-full" />
      </div>
      <div className="flex-1 p-5 flex flex-col gap-5">
        <SkeletonBlock className="h-[76px] w-full rounded-[18px]" />
        <div className="grid grid-cols-3 gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20 w-full rounded-[18px]" />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonRow key={i} withBadge={false} stagger={i} />
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
        <SkeletonBlock className="h-10 w-10 rounded-full" />
        <SkeletonBlock className="h-4 w-28" />
      </div>
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-3 w-52" />
          <SkeletonBlock className="h-5 w-24 rounded-full" />
        </div>
        <SkeletonBlock className="h-32 w-full rounded-[18px]" />
        <SkeletonBlock className="h-24 w-full rounded-[18px]" />
        <SkeletonBlock className="h-20 w-full rounded-[18px]" />
      </div>
    </div>
  );
}

export function FormScreenSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
        <SkeletonBlock className="h-10 w-10 rounded-full" />
        <SkeletonBlock className="h-4 w-28" />
      </div>
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-10 w-full rounded-[13px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
