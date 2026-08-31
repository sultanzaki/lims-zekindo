export default function StatChip({
  label,
  value,
  dotColor,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  dotColor?: string;
  tone?: "default" | "danger";
}) {
  const danger = tone === "danger";
  return (
    <div
      className={`flex-1 min-w-0 rounded-[14px] px-4 py-3 flex items-center justify-between gap-2 border ${
        danger ? "bg-danger-bg border-[#F6CDD1]" : "bg-white border-border"
      }`}
    >
      <span className={`flex items-center gap-1.5 text-xs font-semibold truncate ${danger ? "text-[#B00016]" : "text-muted"}`}>
        {dotColor && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />}
        {label}
      </span>
      <span className={`font-mono-data text-[17px] font-semibold shrink-0 ${danger ? "text-[#B00016]" : "text-text"}`}>{value}</span>
    </div>
  );
}
