export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

export function SkeletonRow({ withBadge = true, stagger = 0 }: { withBadge?: boolean; stagger?: number }) {
  return (
    <div
      className="stagger-item flex items-center gap-2.5 bg-white border border-border rounded-[18px] md:rounded-2xl p-3.5"
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

/** Static placeholder for Sidebar.tsx — shown while the real sidebar's user data
 * (role, name, unread count) is still loading, so desktop never flashes a
 * sidebar-less mobile layout during navigation. */
export function SidebarSkeleton() {
  return (
    <>
      <div className="hidden md:block fixed top-4 right-6 z-30">
        <SkeletonBlock className="h-10 w-10 rounded-full" />
      </div>
      <aside
        style={{ width: "var(--sidebar-w)" }}
        className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 bg-white border-r border-border z-20 overflow-hidden"
      >
        <div className="flex items-center h-16 shrink-0 border-b border-border px-5">
          <SkeletonBlock className="h-6 w-24" />
        </div>
        <div className="px-4 pt-4">
          <SkeletonBlock className="h-9 w-full rounded-full" />
        </div>
        <div className="flex-1 px-3 py-4 flex flex-col gap-5">
          <div className="flex flex-col gap-0.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-9 w-full rounded-xl" />
            ))}
          </div>
          <div className="flex flex-col gap-0.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-9 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="border-t border-border p-3">
          <SkeletonBlock className="h-11 w-full rounded-xl" />
        </div>
      </aside>
    </>
  );
}

/** Desktop title bar to match BackHeader's md: look — plain title, no back button
 * (navigation lives in the sidebar). Pair with a `md:hidden` mobile header. */
function DesktopTitleBar({ width = "w-40" }: { width?: string }) {
  return (
    <div className="hidden md:block sticky top-0 bg-white border-b border-border px-8 pt-10 pb-4 z-10">
      <SkeletonBlock className={`h-6 ${width}`} />
    </div>
  );
}

export function TabScreenSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)]">
      <SidebarSkeleton />
      <div className="md:hidden px-5 pt-6 pb-4 bg-white border-b border-border flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-5 w-32" />
        </div>
        <SkeletonBlock className="h-10 w-10 rounded-full" />
      </div>
      <DesktopTitleBar />
      <div className="flex-1 p-5 md:px-8 md:py-6 flex flex-col gap-2.5 md:max-w-[1200px] md:w-full">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} stagger={i} />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)]">
      <SidebarSkeleton />
      <div className="md:hidden px-5 pt-6 pb-4 bg-white border-b border-border flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-5 w-32" />
        </div>
        <SkeletonBlock className="h-10 w-10 rounded-full" />
      </div>
      <div className="flex-1 p-5 md:px-8 md:pt-10 flex flex-col gap-5 md:max-w-[1100px] md:w-full">
        <SkeletonBlock className="h-[76px] w-full rounded-[18px] md:rounded-2xl" />
        <div className="grid grid-cols-3 gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20 w-full rounded-[18px] md:rounded-2xl" />
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

/** Used only by pages that keep a full-bleed, chrome-free mobile layout even on
 * desktop (print-style views: sample label, certificate) — deliberately has no
 * sidebar, so it must stay separate from DetailScreenSkeletonWithSidebar below. */
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

/** Same mobile shape as DetailScreenSkeleton, but with the sidebar + a desktop
 * two-column hint — for detail-style pages that DO keep the sidebar (sample
 * detail, help). */
export function DetailScreenSkeletonWithSidebar() {
  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)]">
      <SidebarSkeleton />
      <div className="md:hidden flex items-center gap-3 px-4 py-3.5 border-b border-border bg-white">
        <SkeletonBlock className="h-10 w-10 rounded-full" />
        <SkeletonBlock className="h-4 w-28" />
      </div>
      <DesktopTitleBar width="w-48" />
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-5 md:hidden">
        <div className="flex flex-col gap-2">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-3 w-52" />
          <SkeletonBlock className="h-5 w-24 rounded-full" />
        </div>
        <SkeletonBlock className="h-32 w-full rounded-[18px]" />
        <SkeletonBlock className="h-24 w-full rounded-[18px]" />
        <SkeletonBlock className="h-20 w-full rounded-[18px]" />
      </div>
      <div className="hidden md:grid md:grid-cols-[360px_1fr] md:gap-5 md:px-8 md:py-6 md:max-w-[1280px] md:w-full">
        <div className="flex flex-col gap-3.5">
          <SkeletonBlock className="h-24 w-full rounded-2xl" />
          <SkeletonBlock className="h-40 w-full rounded-2xl" />
        </div>
        <div className="flex flex-col gap-3.5">
          <SkeletonBlock className="h-28 w-full rounded-2xl" />
          <SkeletonBlock className="h-28 w-full rounded-2xl" />
          <SkeletonBlock className="h-28 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function FormScreenSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)]">
      <SidebarSkeleton />
      <div className="md:hidden flex items-center gap-3 px-4 py-3.5 border-b border-border bg-white">
        <SkeletonBlock className="h-10 w-10 rounded-full" />
        <SkeletonBlock className="h-4 w-28" />
      </div>
      <DesktopTitleBar />
      <div className="flex-1 px-5 pt-4.5 pb-7 md:px-8 md:py-6 flex flex-col gap-4 md:max-w-[640px] md:w-full">
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
