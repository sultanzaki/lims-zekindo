import { prisma } from "@/lib/db";
import { jakartaDayKey } from "@/lib/tz";

const DAY_MS = 24 * 60 * 60 * 1000;
const OPEN_STATUSES = ["Pending Login", "In Testing", "Awaiting Supervisor Review", "Awaiting QA Approval"];

function jakartaWeekKey(date: Date): string {
  // ISO-ish week key: the Monday of the week the date falls in, in Jakarta local time.
  const key = jakartaDayKey(date);
  const d = new Date(`${key}T00:00:00+07:00`);
  const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  const monday = new Date(d.getTime() - (dow - 1) * DAY_MS);
  return jakartaDayKey(monday);
}

export async function getKpiSummary() {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last30 = new Date(now.getTime() - 30 * DAY_MS);

  const [
    samplesThisMonth,
    samplesLastMonth,
    approvedLast30,
    rejectedLast30,
    completedLast30,
    openSamples,
    equipmentOverdue,
    reagentsAll,
  ] = await Promise.all([
    prisma.sample.count({ where: { receivedDate: { gte: startOfThisMonth } } }),
    prisma.sample.count({ where: { receivedDate: { gte: startOfLastMonth, lt: startOfThisMonth } } }),
    prisma.sample.count({ where: { status: "Complete", approvedAt: { gte: last30 } } }),
    prisma.custodyEvent.count({ where: { label: { contains: "Rejected" }, time: { gte: last30 } } }),
    prisma.sample.findMany({
      where: { status: "Complete", approvedAt: { gte: last30 } },
      select: { receivedDate: true, approvedAt: true, sampleType: { select: { targetTatHours: true } } },
    }),
    prisma.sample.findMany({
      where: { status: { in: OPEN_STATUSES } },
      select: { receivedDate: true, sampleType: { select: { targetTatHours: true } } },
    }),
    prisma.equipment.count({ where: { nextCalibrationDue: { lt: now } } }),
    prisma.reagent.findMany({ select: { quantity: true, minStockLevel: true, expiryDate: true } }),
  ]);

  const volumeDeltaPct = samplesLastMonth > 0 ? Math.round(((samplesThisMonth - samplesLastMonth) / samplesLastMonth) * 100) : null;

  const onTimeCount = completedLast30.filter((s) => {
    const target = s.approvedAt!.getTime() <= s.receivedDate.getTime() + (s.sampleType?.targetTatHours ?? 48) * 60 * 60 * 1000;
    return target;
  }).length;
  const tatComplianceRate = completedLast30.length > 0 ? Math.round((onTimeCount / completedLast30.length) * 100) : null;

  const reviewedLast30 = approvedLast30 + rejectedLast30;
  const passRate = reviewedLast30 > 0 ? Math.round((approvedLast30 / reviewedLast30) * 100) : null;

  const overdueOpenCount = openSamples.filter(
    (s) => s.receivedDate.getTime() + (s.sampleType?.targetTatHours ?? 48) * 60 * 60 * 1000 < now.getTime()
  ).length;

  const soonMs = 14 * DAY_MS;
  const reagentAlertCount = reagentsAll.filter((r) => {
    const lowStock = r.quantity <= r.minStockLevel;
    const expired = r.expiryDate && r.expiryDate.getTime() < now.getTime();
    const expiringSoon = r.expiryDate && r.expiryDate.getTime() - now.getTime() < soonMs;
    return lowStock || expired || expiringSoon;
  }).length;

  return {
    samplesThisMonth,
    volumeDeltaPct,
    tatComplianceRate,
    passRate,
    overdueOpenCount,
    equipmentOverdue,
    reagentAlertCount,
  };
}

export async function getVolumeTrend(days = 30) {
  const since = new Date(Date.now() - days * DAY_MS);
  const rows = await prisma.sample.findMany({
    where: { receivedDate: { gte: since } },
    select: { receivedDate: true },
  });

  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = jakartaDayKey(r.receivedDate);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const series: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * DAY_MS);
    const key = jakartaDayKey(d);
    series.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return series;
}

export async function getStatusDistribution() {
  const rows = await prisma.sample.groupBy({ by: ["status"], _count: { _all: true } });
  return rows
    .map((r) => ({ status: r.status, count: r._count._all }))
    .sort((a, b) => b.count - a.count);
}

export async function getPassRejectTrend(weeks = 12) {
  const since = new Date(Date.now() - weeks * 7 * DAY_MS);
  const [approvedRows, rejectedRows] = await Promise.all([
    prisma.sample.findMany({ where: { status: "Complete", approvedAt: { gte: since } }, select: { approvedAt: true } }),
    prisma.custodyEvent.findMany({ where: { label: { contains: "Rejected" }, time: { gte: since } }, select: { time: true } }),
  ]);

  const approvedByWeek = new Map<string, number>();
  for (const r of approvedRows) {
    const key = jakartaWeekKey(r.approvedAt!);
    approvedByWeek.set(key, (approvedByWeek.get(key) ?? 0) + 1);
  }
  const rejectedByWeek = new Map<string, number>();
  for (const r of rejectedRows) {
    const key = jakartaWeekKey(r.time);
    rejectedByWeek.set(key, (rejectedByWeek.get(key) ?? 0) + 1);
  }

  const series: { week: string; approved: number; rejected: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 7 * DAY_MS);
    const key = jakartaWeekKey(d);
    if (series.some((s) => s.week === key)) continue;
    series.push({ week: key, approved: approvedByWeek.get(key) ?? 0, rejected: rejectedByWeek.get(key) ?? 0 });
  }
  return series;
}

export async function getVolumeBySampleType(limit = 6) {
  const rows = await prisma.sample.groupBy({ by: ["type"], _count: { _all: true } });
  const sorted = rows.map((r) => ({ label: r.type, count: r._count._all })).sort((a, b) => b.count - a.count);
  return foldToOther(sorted, limit);
}

export async function getVolumeByBusinessUnit(limit = 6) {
  const rows = await prisma.sample.groupBy({ by: ["businessUnitId"], _count: { _all: true } });
  const businessUnits = await prisma.businessUnit.findMany({ select: { id: true, name: true } });
  const nameById = new Map(businessUnits.map((b) => [b.id, b.name]));
  const sorted = rows
    .map((r) => ({ label: r.businessUnitId ? nameById.get(r.businessUnitId) ?? "Unknown" : "Not specified", count: r._count._all }))
    .sort((a, b) => b.count - a.count);
  return foldToOther(sorted, limit);
}

function foldToOther(sorted: { label: string; count: number }[], limit: number) {
  if (sorted.length <= limit) return sorted;
  const head = sorted.slice(0, limit - 1);
  const tail = sorted.slice(limit - 1);
  const otherCount = tail.reduce((sum, r) => sum + r.count, 0);
  return [...head, { label: "Other", count: otherCount }];
}

export async function getTatComplianceByType() {
  const samples = await prisma.sample.findMany({
    where: { status: "Complete" },
    select: { type: true, receivedDate: true, approvedAt: true, sampleType: { select: { targetTatHours: true } } },
  });

  const byType = new Map<string, { onTime: number; late: number }>();
  for (const s of samples) {
    if (!s.approvedAt) continue;
    const targetHours = s.sampleType?.targetTatHours ?? 48;
    const onTime = s.approvedAt.getTime() <= s.receivedDate.getTime() + targetHours * 60 * 60 * 1000;
    const entry = byType.get(s.type) ?? { onTime: 0, late: 0 };
    if (onTime) entry.onTime += 1;
    else entry.late += 1;
    byType.set(s.type, entry);
  }

  return Array.from(byType.entries())
    .map(([type, v]) => ({ type, ...v, total: v.onTime + v.late }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}

export async function getDeviationTrend(weeks = 12) {
  const since = new Date(Date.now() - weeks * 7 * DAY_MS);
  const rows = await prisma.deviation.findMany({ where: { openedAt: { gte: since } }, select: { openedAt: true } });

  const byWeek = new Map<string, number>();
  for (const r of rows) {
    const key = jakartaWeekKey(r.openedAt);
    byWeek.set(key, (byWeek.get(key) ?? 0) + 1);
  }

  const series: { week: string; count: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 7 * DAY_MS);
    const key = jakartaWeekKey(d);
    if (series.some((s) => s.week === key)) continue;
    series.push({ week: key, count: byWeek.get(key) ?? 0 });
  }
  return series;
}

export async function getEquipmentHealth() {
  const rows = await prisma.equipment.groupBy({ by: ["status"], _count: { _all: true } });
  const byStatus = new Map(rows.map((r) => [r.status, r._count._all]));
  return {
    operational: byStatus.get("Operational") ?? 0,
    underMaintenance: byStatus.get("Under Maintenance") ?? 0,
    outOfService: byStatus.get("Out of Service") ?? 0,
  };
}

export async function getReagentHealth() {
  const now = Date.now();
  const soonMs = 14 * DAY_MS;
  const reagents = await prisma.reagent.findMany({ select: { quantity: true, minStockLevel: true, expiryDate: true } });

  let expired = 0;
  let lowStock = 0;
  let expiringSoon = 0;
  let ok = 0;
  for (const r of reagents) {
    if (r.expiryDate && r.expiryDate.getTime() < now) expired += 1;
    else if (r.quantity <= r.minStockLevel) lowStock += 1;
    else if (r.expiryDate && r.expiryDate.getTime() - now < soonMs) expiringSoon += 1;
    else ok += 1;
  }
  return { expired, lowStock, expiringSoon, ok };
}
