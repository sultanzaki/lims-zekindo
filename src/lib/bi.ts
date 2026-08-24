// "Advanced BI" — simple, transparent statistics, not a trained ML model:
// - TAT prediction: historical average duration per sample type, adjusted by
//   how loaded the lab's open queue currently is.
// - Anomaly detection: a classic z-score check against each test's own
//   historical mean/stddev.
// - Technician performance: mined from AuditLog (the only place a
//   submitting user is actually recorded — Test rows themselves carry no
//   technician reference).
import { prisma } from "@/lib/db";
import { parseSpecVerdict } from "@/lib/spec";

const OPEN_STATUSES = ["Pending Login", "In Testing", "Awaiting Supervisor Review", "Awaiting QA Approval"];
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export type TatPrediction = {
  sampleType: string;
  targetHours: number;
  historicalAvgHours: number | null;
  historicalSampleSize: number;
  currentOpenCount: number;
  loadFactor: number;
  predictedHours: number;
};

export async function getTatPredictions(): Promise<TatPrediction[]> {
  const types = await prisma.sampleTypeCatalog.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const totalOpen = await prisma.sample.count({ where: { status: { in: OPEN_STATUSES } } });
  // Heuristic baseline "comfortable" queue depth — below this, load doesn't
  // stretch the estimate; well above it, the estimate scales up (capped).
  const baseline = Math.max(6, types.length * 2);
  const loadFactor = Math.min(1.8, 1 + Math.max(0, (totalOpen - baseline) / baseline) * 0.4);

  const out: TatPrediction[] = [];
  for (const t of types) {
    const [completed, openForType] = await Promise.all([
      prisma.sample.findMany({
        where: { sampleTypeId: t.id, status: "Complete", approvedAt: { not: null } },
        orderBy: { approvedAt: "desc" },
        take: 20,
        select: { receivedDate: true, approvedAt: true },
      }),
      prisma.sample.count({ where: { sampleTypeId: t.id, status: { in: OPEN_STATUSES } } }),
    ]);
    const durations = completed.map((s) => (s.approvedAt!.getTime() - s.receivedDate.getTime()) / HOUR_MS);
    const avg = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
    const base = avg ?? t.targetTatHours;
    out.push({
      sampleType: t.name,
      targetHours: t.targetTatHours,
      historicalAvgHours: avg !== null ? Math.round(avg) : null,
      historicalSampleSize: durations.length,
      currentOpenCount: openForType,
      loadFactor: Math.round(loadFactor * 100) / 100,
      predictedHours: Math.round(base * loadFactor),
    });
  }
  return out.sort((a, b) => b.currentOpenCount - a.currentOpenCount);
}

export type ResultAnomaly = {
  testId: string;
  sampleId: string;
  testName: string;
  result: string;
  unit: string;
  mean: number;
  stddev: number;
  zScore: number;
  submittedAt: Date;
};

export async function getResultAnomalies(days = 30, zThreshold = 2.5): Promise<ResultAnomaly[]> {
  const since = new Date(Date.now() - days * DAY_MS);
  const recentLogs = await prisma.auditLog.findMany({
    where: { action: "test.result_submitted", createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });
  if (recentLogs.length === 0) return [];

  const testIds = [...new Set(recentLogs.map((l) => l.entityId))];
  const tests = await prisma.test.findMany({
    where: { id: { in: testIds } },
    select: { id: true, name: true, unit: true, result: true, sampleId: true },
  });
  const testById = new Map(tests.map((t) => [t.id, t]));

  const testNames = [...new Set(tests.map((t) => t.name))];
  const historicalByName = await prisma.test.findMany({
    where: { name: { in: testNames }, result: { not: null } },
    select: { name: true, result: true },
  });
  const statsByName = new Map<string, { mean: number; stddev: number }>();
  for (const name of testNames) {
    const values = historicalByName
      .filter((t) => t.name === name)
      .map((t) => Number(t.result))
      .filter((n) => Number.isFinite(n));
    if (values.length < 5) continue;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
    const stddev = Math.sqrt(variance);
    if (stddev > 0) statsByName.set(name, { mean, stddev });
  }

  const anomalies: ResultAnomaly[] = [];
  const seen = new Set<string>();
  for (const log of recentLogs) {
    const test = testById.get(log.entityId);
    if (!test || !test.result || seen.has(test.id)) continue;
    seen.add(test.id);
    const stats = statsByName.get(test.name);
    if (!stats) continue;
    const value = Number(test.result);
    if (!Number.isFinite(value)) continue;
    const z = (value - stats.mean) / stats.stddev;
    if (Math.abs(z) >= zThreshold) {
      anomalies.push({
        testId: test.id,
        sampleId: test.sampleId,
        testName: test.name,
        result: test.result,
        unit: test.unit,
        mean: Math.round(stats.mean * 100) / 100,
        stddev: Math.round(stats.stddev * 100) / 100,
        zScore: Math.round(z * 100) / 100,
        submittedAt: log.createdAt,
      });
    }
  }
  return anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}

export type TechnicianStat = {
  userId: string;
  name: string;
  testsSubmitted: number;
  onTimeRate: number | null;
  outOfSpecRate: number | null;
};

export async function getTechnicianPerformance(days = 90): Promise<TechnicianStat[]> {
  const since = new Date(Date.now() - days * DAY_MS);
  const logs = await prisma.auditLog.findMany({
    where: { action: "test.result_submitted", createdAt: { gte: since }, userId: { not: null } },
    include: { user: { select: { id: true, name: true } } },
  });
  if (logs.length === 0) return [];

  const testIds = [...new Set(logs.map((l) => l.entityId))];
  const tests = await prisma.test.findMany({
    where: { id: { in: testIds } },
    select: {
      id: true,
      spec: true,
      result: true,
      sample: { select: { receivedDate: true, sampleType: { select: { targetTatHours: true } } } },
    },
  });
  const testById = new Map(tests.map((t) => [t.id, t]));

  const byUser = new Map<string, { name: string; total: number; onTime: number; fails: number; verdictable: number }>();
  for (const log of logs) {
    if (!log.userId || !log.user) continue;
    const test = testById.get(log.entityId);
    if (!test) continue;
    const entry = byUser.get(log.userId) ?? { name: log.user.name, total: 0, onTime: 0, fails: 0, verdictable: 0 };
    entry.total += 1;
    const targetHours = test.sample.sampleType?.targetTatHours ?? 48;
    const dueAt = test.sample.receivedDate.getTime() + targetHours * HOUR_MS;
    if (log.createdAt.getTime() <= dueAt) entry.onTime += 1;
    const verdict = parseSpecVerdict(test.spec, test.result);
    if (verdict) {
      entry.verdictable += 1;
      if (verdict === "Fail") entry.fails += 1;
    }
    byUser.set(log.userId, entry);
  }

  return [...byUser.entries()]
    .map(([userId, e]) => ({
      userId,
      name: e.name,
      testsSubmitted: e.total,
      onTimeRate: e.total > 0 ? Math.round((e.onTime / e.total) * 100) : null,
      outOfSpecRate: e.verdictable > 0 ? Math.round((e.fails / e.verdictable) * 100) : null,
    }))
    .sort((a, b) => b.testsSubmitted - a.testsSubmitted);
}
