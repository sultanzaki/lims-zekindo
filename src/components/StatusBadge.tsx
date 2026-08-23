import { SampleStatus, STATUS_STYLES } from "@/lib/status";

export default function StatusBadge({ status }: { status: SampleStatus | string }) {
  const style = STATUS_STYLES[status as SampleStatus] ?? { bg: "#F0F4F8", color: "#6B8A96" };
  return (
    <span
      className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap tracking-tight"
      style={{ background: style.bg, color: style.color }}
    >
      {status}
    </span>
  );
}
