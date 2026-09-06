import { FlaskMascot } from "@/components/FlaskMascot";

// Empty-state wrapper. Default: plain (no mascot) — same look as before.
// Pass `mascot` (a FlaskMascot mood) to show the lab flask character above
// the message, plus an optional `action` node (button/link) below it.
export default function EmptyState({
  children,
  mascot,
  mood = "wave",
  action,
  className = "",
}: {
  children: React.ReactNode;
  mascot?: boolean;
  mood?: "wave" | "sleep" | "happy" | "sad";
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-center py-10 px-5 text-muted text-[13px] border border-dashed border-border rounded-[18px] flex flex-col items-center gap-3 ${className}`}
    >
      {mascot && <FlaskMascot size={88} mood={mood} />}
      <div>{children}</div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
