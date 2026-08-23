export default function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center py-10 px-5 text-muted text-[13px] border border-dashed border-border rounded-[18px]">
      {children}
    </div>
  );
}
