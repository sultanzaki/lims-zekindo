import { APP_TIME_ZONE, jakartaDayKey } from "@/lib/tz";

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const datePart = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  });
  const timePart = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: APP_TIME_ZONE,
  });
  return `${datePart} · ${timePart} WIB`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: APP_TIME_ZONE });
}

export function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export function dueLabelFor(receivedDate: Date, targetTatHours: number): { label: string; color: string } {
  const dueAt = receivedDate.getTime() + targetTatHours * 60 * 60 * 1000;
  const hoursLeft = (dueAt - Date.now()) / (60 * 60 * 1000);
  if (hoursLeft <= 0) return { label: "Overdue", color: "#D0021B" };
  if (hoursLeft < 1) return { label: "Due <1h", color: "#F5A623" };
  if (hoursLeft < 24) return { label: `Due in ${Math.round(hoursLeft)}h`, color: "#F5A623" };
  return { label: `Due in ${Math.round(hoursLeft / 24)}d`, color: "#7A8B94" };
}

export function dayGroupLabel(date: Date): "Today" | "Yesterday" | "Earlier" {
  const now = new Date();
  const todayKey = jakartaDayKey(now);
  const yesterdayKey = jakartaDayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const key = jakartaDayKey(date);
  if (key === todayKey) return "Today";
  if (key === yesterdayKey) return "Yesterday";
  return "Earlier";
}
