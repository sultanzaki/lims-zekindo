import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { getOpenSamplesByDueDay, dayKeyToDate, addDays } from "@/lib/calendar";
import { jakartaDayKey } from "@/lib/tz";
import { formatDateTime } from "@/lib/format";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import EmptyState from "@/components/ui/EmptyState";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_LABEL = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const DAY_HEADER_LABEL = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });

function monthParam(key: string): string {
  return key.slice(0, 7); // "YYYY-MM"
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  const user = await requireUser();
  const { month: monthQ, day: dayQ } = await searchParams;

  const todayKey = jakartaDayKey(new Date());
  const monthKey = /^\d{4}-\d{2}$/.test(monthQ ?? "") ? monthQ! : monthParam(todayKey);
  const selectedDay = /^\d{4}-\d{2}-\d{2}$/.test(dayQ ?? "") ? dayQ! : todayKey;

  const [year, month] = monthKey.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEndExclusive = new Date(Date.UTC(year, month, 1));
  const prevMonth = new Date(Date.UTC(year, month - 2, 1));
  const nextMonth = new Date(Date.UTC(year, month, 1));
  const prevMonthKey = monthParam(prevMonth.toISOString());
  const nextMonthKey = monthParam(nextMonth.toISOString());

  const [byDay, unread] = await Promise.all([getOpenSamplesByDueDay(), getUnreadCount(user.id)]);

  // Leading blanks so the 1st lands in the correct weekday column (Sun-first).
  const leadingBlanks = monthStart.getUTCDay();
  const totalDays = Math.round((monthEndExclusive.getTime() - monthStart.getTime()) / (24 * 60 * 60 * 1000));
  const cells: (string | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => jakartaDayKeyOf(addDays(monthStart, i))),
  ];

  function jakartaDayKeyOf(d: Date): string {
    // Grid cells are built from UTC-midnight synthetic dates, so their
    // Jakarta calendar day is just the same Y-M-D (no real timezone
    // conversion needed here since we're only using this to label cells).
    return d.toISOString().slice(0, 10);
  }

  const selectedItems = byDay.get(selectedDay) ?? [];
  const selectedDate = dayKeyToDate(selectedDay);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="TAT Calendar" backHref="/dashboard" />
      <div className="flex-1 px-5 md:px-8 pt-4.5 pb-7 flex flex-col gap-4 md:grid md:grid-cols-[380px_1fr] md:gap-5 md:items-start md:max-w-[960px] md:w-full">
        <div className="bg-white border border-border rounded-[18px] md:rounded-2xl shadow-card p-4">
          <div className="flex items-center justify-between mb-3">
            <Link
              href={`/calendar?month=${prevMonthKey}&day=${selectedDay}`}
              className="w-8 h-8 rounded-full bg-page-bg flex items-center justify-center"
              aria-label="Previous month"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A5F7A" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <div className="text-[15px] font-bold text-text tracking-tight">{MONTH_LABEL.format(monthStart)}</div>
            <Link
              href={`/calendar?month=${nextMonthKey}&day=${selectedDay}`}
              className="w-8 h-8 rounded-full bg-page-bg flex items-center justify-center"
              aria-label="Next month"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A5F7A" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {WEEKDAY_LABELS.map((w, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-faint py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((key, i) => {
              if (!key) return <div key={`blank-${i}`} />;
              const items = byDay.get(key) ?? [];
              const hasOverdue = items.some((s) => s.overdue);
              const isSelected = key === selectedDay;
              const isToday = key === todayKey;
              const dotColor = hasOverdue ? "#D0021B" : items.length > 0 ? "#F5A623" : null;
              return (
                <Link
                  key={key}
                  href={`/calendar?month=${monthKey}&day=${key}`}
                  className="aspect-square flex flex-col items-center justify-center gap-0.5 rounded-[10px] relative"
                  style={{
                    background: isSelected ? "#1A5F7A" : isToday ? "#E8F4FA" : "transparent",
                  }}
                >
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: isSelected ? "#fff" : "#0B0B0B" }}
                  >
                    {Number(key.slice(8, 10))}
                  </span>
                  {dotColor && (
                    <span
                      className="w-[5px] h-[5px] rounded-full"
                      style={{ background: isSelected ? "#fff" : dotColor }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border-soft text-[10px] text-muted">
            <span className="flex items-center gap-1">
              <span className="w-[7px] h-[7px] rounded-full bg-danger inline-block" /> Overdue
            </span>
            <span className="flex items-center gap-1">
              <span className="w-[7px] h-[7px] rounded-full bg-warning inline-block" /> Due
            </span>
            <Link href={`/calendar?month=${monthParam(todayKey)}&day=${todayKey}`} className="ml-auto font-semibold text-primary">
              Today
            </Link>
          </div>
        </div>

        <div>
          <div className="text-[13px] font-semibold text-text mb-2.5">
            {DAY_HEADER_LABEL.format(selectedDate)} {selectedDay === todayKey && <span className="text-primary">· Today</span>}
          </div>
          <div className="flex flex-col gap-2">
            {selectedItems.map((s) => (
              <Link
                key={s.id}
                href={`/samples/${s.id}`}
                className="bg-white border border-border rounded-2xl shadow-card-sm px-3.5 py-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text truncate">{s.name || s.id}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {s.type} · {s.status}
                  </div>
                </div>
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
                  style={{
                    background: s.overdue ? "#FDECEA" : "#FEF3E0",
                    color: s.overdue ? "#B00016" : "#9A6100",
                  }}
                >
                  {s.overdue ? "Overdue" : formatDateTime(s.dueAt)}
                </span>
              </Link>
            ))}
            {selectedItems.length === 0 && <EmptyState>Nothing due this day.</EmptyState>}
          </div>
        </div>
      </div>
    </div>
  );
}
