import { prisma } from "@/lib/db";
import type { requireUser } from "@/lib/auth";
import { canManageInventoryAndCatalog, canViewAnalytics } from "@/lib/roles";
import { getKpiSummary } from "@/lib/analytics";
import { getResultAnomalies } from "@/lib/bi";
import { recordReagentTransactionAction, changeEquipmentStatusAction, logCalibrationAction } from "@/lib/actions/inventory";

export type AiUser = Awaited<ReturnType<typeof requireUser>>;

type JsonSchema = Record<string, unknown>;
type ToolArgs = Record<string, unknown>;

type ReadTool = {
  readonly: true;
  name: string;
  description: string;
  parameters: JsonSchema;
  run: (args: ToolArgs, user: AiUser) => Promise<unknown>;
};

type WriteTool = {
  readonly: false;
  name: string;
  description: string;
  parameters: JsonSchema;
  describe: (args: ToolArgs) => Promise<string>;
  run: (args: ToolArgs, user: AiUser) => Promise<{ ok: true; message: string } | { ok: false; error: string }>;
};

export type AnyTool = ReadTool | WriteTool;

const OPEN_STATUSES = ["Pending Login", "In Testing", "Awaiting Supervisor Review", "Awaiting QA Approval"];

// ---------- Read tools (auto-executed, never mutate anything) ----------

const getOverdueSamples: ReadTool = {
  readonly: true,
  name: "get_overdue_samples",
  description: "List samples that are currently open (not Complete/Rejected) and past their target turnaround time.",
  parameters: { type: "object", properties: {}, required: [] },
  run: async () => {
    const now = Date.now();
    const samples = await prisma.sample.findMany({
      where: { status: { in: OPEN_STATUSES } },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        receivedDate: true,
        sampleType: { select: { targetTatHours: true } },
      },
    });
    const overdue = samples
      .map((s) => {
        const targetHours = s.sampleType?.targetTatHours ?? 48;
        const dueAt = s.receivedDate.getTime() + targetHours * 3600000;
        return { id: s.id, name: s.name, type: s.type, status: s.status, hoursOverdue: Math.round((now - dueAt) / 3600000) };
      })
      .filter((s) => s.hoursOverdue > 0)
      .sort((a, b) => b.hoursOverdue - a.hoursOverdue);
    return { count: overdue.length, samples: overdue.slice(0, 20) };
  },
};

const getSampleStatus: ReadTool = {
  readonly: true,
  name: "get_sample_status",
  description: "Get the current status and test results for one sample by its exact ID.",
  parameters: {
    type: "object",
    properties: { sampleId: { type: "string", description: "e.g. LAB-24-0144" } },
    required: ["sampleId"],
  },
  run: async (args) => {
    const sample = await prisma.sample.findUnique({
      where: { id: String(args.sampleId) },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        tests: { select: { name: true, status: true, result: true, unit: true, spec: true } },
      },
    });
    if (!sample) return { found: false };
    return { found: true, ...sample };
  },
};

const getLowStockReagents: ReadTool = {
  readonly: true,
  name: "get_low_stock_reagents",
  description: "List reagents/chemicals at or below minimum stock level, or expired/expiring within 14 days.",
  parameters: { type: "object", properties: {}, required: [] },
  run: async (_args, user) => {
    if (!canManageInventoryAndCatalog(user.accessRole)) return { error: "You don't have permission to view inventory." };
    const now = Date.now();
    const soonMs = 14 * 24 * 3600000;
    const reagents = await prisma.reagent.findMany({
      select: { id: true, name: true, lotNumber: true, quantity: true, unit: true, minStockLevel: true, expiryDate: true },
    });
    const flagged = reagents
      .filter((r) => r.quantity <= r.minStockLevel || (r.expiryDate && r.expiryDate.getTime() - now < soonMs))
      .map((r) => ({
        id: r.id,
        name: r.name,
        lotNumber: r.lotNumber,
        quantity: r.quantity,
        unit: r.unit,
        minStockLevel: r.minStockLevel,
        lowStock: r.quantity <= r.minStockLevel,
        expired: r.expiryDate ? r.expiryDate.getTime() < now : false,
        expiringSoon: r.expiryDate ? r.expiryDate.getTime() - now < soonMs : false,
      }));
    return { count: flagged.length, reagents: flagged };
  },
};

const searchReagentStock: ReadTool = {
  readonly: true,
  name: "search_reagent_stock",
  description:
    "Search reagents/chemicals by name to get their exact reagentId, current quantity, and unit. Always call this before proposing record_reagent_usage — that tool needs the exact reagentId, never guess it.",
  parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  run: async (args, user) => {
    if (!canManageInventoryAndCatalog(user.accessRole)) return { error: "You don't have permission to view inventory." };
    const reagents = await prisma.reagent.findMany({
      where: { name: { contains: String(args.query ?? ""), mode: "insensitive" } },
      select: { id: true, name: true, lotNumber: true, quantity: true, unit: true, minStockLevel: true, expiryDate: true },
      take: 10,
    });
    return { reagents };
  },
};

const searchEquipment: ReadTool = {
  readonly: true,
  name: "search_equipment",
  description:
    "Search equipment by name or asset tag to get its exact equipmentId and current status. Call this before proposing log_equipment_calibration or change_equipment_status.",
  parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  run: async (args, user) => {
    if (!canManageInventoryAndCatalog(user.accessRole)) return { error: "You don't have permission to view inventory." };
    const equipment = await prisma.equipment.findMany({
      where: {
        OR: [
          { name: { contains: String(args.query ?? ""), mode: "insensitive" } },
          { assetTag: { contains: String(args.query ?? ""), mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, assetTag: true, status: true, nextCalibrationDue: true },
      take: 10,
    });
    return { equipment };
  },
};

const getUpcomingCalibrations: ReadTool = {
  readonly: true,
  name: "get_upcoming_calibrations",
  description: "List equipment whose next calibration is overdue or due within N days (default 30).",
  parameters: {
    type: "object",
    properties: { days: { type: "number", description: "Look-ahead window in days, default 30" } },
    required: [],
  },
  run: async (args, user) => {
    if (!canManageInventoryAndCatalog(user.accessRole)) return { error: "You don't have permission to view equipment." };
    const days = typeof args.days === "number" && args.days > 0 ? args.days : 30;
    const cutoff = new Date(Date.now() + days * 24 * 3600000);
    const equipment = await prisma.equipment.findMany({
      where: { nextCalibrationDue: { lt: cutoff } },
      select: { id: true, name: true, assetTag: true, status: true, nextCalibrationDue: true },
      orderBy: { nextCalibrationDue: "asc" },
    });
    return { count: equipment.length, equipment };
  },
};

const getAnalyticsSummary: ReadTool = {
  readonly: true,
  name: "get_analytics_summary",
  description:
    "Get a high-level lab performance summary: sample volume trend, TAT compliance, pass rate, overdue/equipment/reagent alert counts, plus flagged statistical result anomalies from the last 30 days.",
  parameters: { type: "object", properties: {}, required: [] },
  run: async (_args, user) => {
    if (!canViewAnalytics(user.accessRole)) return { error: "You don't have permission to view analytics." };
    const [kpi, anomalies] = await Promise.all([getKpiSummary(), getResultAnomalies(30, 2.5)]);
    return {
      kpi,
      anomalyCount: anomalies.length,
      anomalies: anomalies.slice(0, 5).map((a) => ({
        sampleId: a.sampleId,
        testName: a.testName,
        result: a.result,
        zScore: Math.round(a.zScore * 10) / 10,
      })),
    };
  },
};

// ---------- Write tools (proposed, executed only after human confirmation,
// always by calling the exact same server action a form submit would use —
// same role gate, same audit log entry, same notifications) ----------

const recordReagentUsage: WriteTool = {
  readonly: false,
  name: "record_reagent_usage",
  description:
    "Record a stock movement (RECEIVED, CONSUMED, ADJUSTED, or DISPOSED) for one reagent/chemical. Always call search_reagent_stock first to resolve the exact reagentId and to check enough quantity is available for a CONSUMED/DISPOSED amount.",
  parameters: {
    type: "object",
    properties: {
      reagentId: { type: "string" },
      type: { type: "string", enum: ["RECEIVED", "CONSUMED", "ADJUSTED", "DISPOSED"] },
      amount: { type: "number", description: "For ADJUSTED this is the new total count, not a delta." },
      reason: { type: "string" },
    },
    required: ["reagentId", "type", "amount"],
  },
  describe: async (args) => {
    const reagent = await prisma.reagent.findUnique({ where: { id: String(args.reagentId) }, select: { name: true, unit: true } });
    const label = reagent?.name ?? String(args.reagentId);
    const verb =
      { RECEIVED: "Receive", CONSUMED: "Consume", ADJUSTED: "Adjust to", DISPOSED: "Dispose" }[String(args.type)] ??
      String(args.type);
    const reason = args.reason ? ` — ${args.reason}` : "";
    return `${verb} ${args.amount} ${reagent?.unit ?? ""} of ${label}${reason}`.replace(/\s+/g, " ").trim();
  },
  run: async (args) => {
    const fd = new FormData();
    fd.set("id", String(args.reagentId ?? ""));
    fd.set("type", String(args.type ?? ""));
    fd.set("amount", String(args.amount ?? ""));
    fd.set("reason", String(args.reason ?? ""));
    const result = await recordReagentTransactionAction({}, fd);
    if (result.error) return { ok: false, error: result.error };
    return { ok: true, message: "Stock movement recorded." };
  },
};

const logEquipmentCalibration: WriteTool = {
  readonly: false,
  name: "log_equipment_calibration",
  description:
    "Log that equipment calibration was completed: sets last-calibrated to now, sets the next due date, and marks the equipment Operational. Call search_equipment first to resolve the exact equipmentId.",
  parameters: {
    type: "object",
    properties: {
      equipmentId: { type: "string" },
      nextCalibrationDue: { type: "string", description: "ISO date, e.g. 2026-12-20" },
      result: { type: "string" },
    },
    required: ["equipmentId"],
  },
  describe: async (args) => {
    const equipment = await prisma.equipment.findUnique({ where: { id: String(args.equipmentId) }, select: { name: true } });
    const label = equipment?.name ?? String(args.equipmentId);
    const due = args.nextCalibrationDue ? `, next due ${args.nextCalibrationDue}` : "";
    const result = args.result ? ` — ${args.result}` : "";
    return `Log calibration for ${label}${due}${result}`;
  },
  run: async (args) => {
    const fd = new FormData();
    fd.set("id", String(args.equipmentId ?? ""));
    fd.set("nextCalibrationDue", String(args.nextCalibrationDue ?? ""));
    fd.set("result", String(args.result ?? ""));
    const result = await logCalibrationAction({}, fd);
    if (result.error) return { ok: false, error: result.error };
    return { ok: true, message: "Calibration logged." };
  },
};

const changeEquipmentStatus: WriteTool = {
  readonly: false,
  name: "change_equipment_status",
  description:
    "Change an equipment's status (Operational, Under Maintenance, Out of Service). Call search_equipment first to resolve the exact equipmentId.",
  parameters: {
    type: "object",
    properties: {
      equipmentId: { type: "string" },
      status: { type: "string", enum: ["Operational", "Under Maintenance", "Out of Service"] },
      reason: { type: "string" },
    },
    required: ["equipmentId", "status"],
  },
  describe: async (args) => {
    const equipment = await prisma.equipment.findUnique({ where: { id: String(args.equipmentId) }, select: { name: true } });
    const label = equipment?.name ?? String(args.equipmentId);
    const reason = args.reason ? ` — ${args.reason}` : "";
    return `Change ${label} status to "${args.status}"${reason}`;
  },
  run: async (args) => {
    const fd = new FormData();
    fd.set("id", String(args.equipmentId ?? ""));
    fd.set("status", String(args.status ?? ""));
    fd.set("reason", String(args.reason ?? ""));
    const result = await changeEquipmentStatusAction({}, fd);
    if (result.error) return { ok: false, error: result.error };
    return { ok: true, message: "Status updated." };
  },
};

export const AI_TOOLS: AnyTool[] = [
  getOverdueSamples,
  getSampleStatus,
  getLowStockReagents,
  searchReagentStock,
  searchEquipment,
  getUpcomingCalibrations,
  getAnalyticsSummary,
  recordReagentUsage,
  logEquipmentCalibration,
  changeEquipmentStatus,
];

export function findTool(name: string): AnyTool | undefined {
  return AI_TOOLS.find((t) => t.name === name);
}

export function toOpenAiTools() {
  return AI_TOOLS.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}
