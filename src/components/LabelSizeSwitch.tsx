import Link from "next/link";
import type { LabelSize } from "@/components/LabelCard";

const OPTIONS: { value: LabelSize; label: string; hint: string }[] = [
  { value: "small", label: "Small", hint: "5×2 cm" },
  { value: "medium", label: "Medium", hint: "10×4 cm" },
  { value: "large", label: "Large", hint: "Standard" },
];

// Query-param driven, not client state — each option is a plain link, so
// the choice survives a refresh and can be shared/bookmarked, and the page
// stays a server component (it already does the QR + Prisma fetch there).
export default function LabelSizeSwitch({ basePath, size, extraParams }: { basePath: string; size: LabelSize; extraParams?: Record<string, string> }) {
  const query = new URLSearchParams(extraParams);
  return (
    <div className="no-print flex items-center gap-1 p-1 rounded-full bg-chip-bg border border-border w-full max-w-[280px]">
      {OPTIONS.map((opt) => {
        const params = new URLSearchParams(query);
        params.set("size", opt.value);
        const active = size === opt.value;
        return (
          <Link
            key={opt.value}
            href={`${basePath}?${params.toString()}`}
            className="flex-1 flex flex-col items-center rounded-full py-1.5 text-[12px] font-semibold transition-colors"
            style={{
              background: active ? "#fff" : "transparent",
              color: active ? "#1A5F7A" : "#5B6B74",
              boxShadow: active ? "0 1px 4px rgba(16,42,58,0.12)" : "none",
            }}
          >
            {opt.label}
            <span className="text-[9px] font-medium opacity-70">{opt.hint}</span>
          </Link>
        );
      })}
    </div>
  );
}
