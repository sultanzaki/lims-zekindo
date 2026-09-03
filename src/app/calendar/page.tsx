import { requireUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { getOpenSamplesByDueDay, monthParam } from "@/lib/calendar";
import { jakartaDayKey } from "@/lib/tz";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import CalendarClient from "@/components/CalendarClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "TAT Calendar" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>;
}) {
  const user = await requireUser();
  const { month: monthQ, day: dayQ } = await searchParams;

  const todayKey = jakartaDayKey(new Date());
  const initialMonthKey = /^\d{4}-\d{2}$/.test(monthQ ?? "") ? monthQ! : monthParam(todayKey);
  const initialSelectedDay = /^\d{4}-\d{2}-\d{2}$/.test(dayQ ?? "") ? dayQ! : todayKey;

  const [byDayMap, unread] = await Promise.all([getOpenSamplesByDueDay(), getUnreadCount(user.id)]);
  const byDay = Object.fromEntries(byDayMap);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="TAT Calendar" backHref="/dashboard" hideDesktop />
      <CalendarClient
        byDay={byDay}
        initialMonthKey={initialMonthKey}
        initialSelectedDay={initialSelectedDay}
        todayKey={todayKey}
      />
    </div>
  );
}
