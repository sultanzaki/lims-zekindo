import { prisma } from "@/lib/db";
import { jakartaDayKey } from "@/lib/tz";

const OPEN_STATUSES = ["Pending Login", "In Testing", "Awaiting Supervisor Review", "Awaiting QA Approval"];
const DAY_MS = 24 * 60 * 60 * 1000;

export type CalendarSample = {
  id: string;
  name: string | null;
  type: string;
  status: string;
  dueAt: Date;
  overdue: boolean;
};

// All open (not yet Complete/Rejected) samples, each placed on the
// Jakarta-local calendar day its TAT target falls due — used to render the
// month grid and the per-day list.
export async function getOpenSamplesByDueDay(): Promise<Map<string, CalendarSample[]>> {
  const rows = await prisma.sample.findMany({
    where: { status: { in: OPEN_STATUSES } },
    include: { sampleType: { select: { targetTatHours: true } } },
    orderBy: { receivedDate: "asc" },
  });

  const now = Date.now();
  const byDay = new Map<string, CalendarSample[]>();
  for (const s of rows) {
    const targetHours = s.sampleType?.targetTatHours ?? 48;
    const dueAt = new Date(s.receivedDate.getTime() + targetHours * 60 * 60 * 1000);
    const key = jakartaDayKey(dueAt);
    const entry: CalendarSample = {
      id: s.id,
      name: s.name,
      type: s.type,
      status: s.status,
      dueAt,
      overdue: dueAt.getTime() < now,
    };
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(entry);
  }
  return byDay;
}

export function dayKeyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}
