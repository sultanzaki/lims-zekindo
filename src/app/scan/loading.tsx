export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-scanner-bg">
      <div className="px-5 pt-6 pb-4 bg-white border-b border-border">
        <div className="h-4 w-28 bg-chip-bg rounded animate-pulse" />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-[220px] h-[220px] rounded-xl bg-white/5 animate-pulse" />
      </div>
    </div>
  );
}
