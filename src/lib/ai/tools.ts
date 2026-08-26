import { prisma } from "@/lib/db";
import type { requireUser } from "@/lib/auth";
import { canManageInventoryAndCatalog, canViewAnalytics, canReviewAsSupervisor, isAdmin } from "@/lib/roles";
import { getKpiSummary } from "@/lib/analytics";
import { getResultAnomalies, getTechnicianPerformance, getTatPredictions } from "@/lib/bi";
import { getSampleDetail } from "@/lib/data";
import {
  recordReagentTransactionAction,
  changeEquipmentStatusAction,
  logCalibrationAction,
  logMaintenanceAction,
} from "@/lib/actions/inventory";
import { markDisposedAction, approveSampleForAssistant, rejectSampleForAssistant } from "@/lib/actions/samples";

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
  // When true, the confirm card collects a password directly from the human
  // (never from the model) and the route merges it into args as `password`
  // right before calling run — used for the two actions that carry a real
  // e-signature requirement (approve/reject).
  needsPassword?: boolean;
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
  description:
    "Get FULL detail for one sample by its exact ID — status, type, priority, source, container, requestor, business unit, who collected it and when, received date, storage location, retention date, who approved/disposed it and when, every test with its result/spec, the full custody trail, linked deviations, uploaded reports, and retest links. Use this for any question about a specific sample beyond just its status (e.g. \"who's the requestor\", \"where is it stored\", \"when was it received\").",
  parameters: {
    type: "object",
    properties: { sampleId: { type: "string", description: "e.g. LAB-24-0144" } },
    required: ["sampleId"],
  },
  run: async (args) => {
    const sample = await getSampleDetail(String(args.sampleId));
    if (!sample) return { found: false };
    return {
      found: true,
      id: sample.id,
      name: sample.name,
      type: sample.type,
      status: sample.status,
      priority: sample.priority,
      source: sample.source,
      container: sample.container,
      requestorName: sample.requestorName,
      businessUnit: sample.businessUnit?.name ?? null,
      collectedBy: sample.collectedBy,
      collectedDate: sample.collectedDate,
      receivedDate: sample.receivedDate,
      storageLocation: sample.storageLocation,
      retentionUntil: sample.retentionUntil,
      approvedBy: sample.approvedBy,
      approvedAt: sample.approvedAt,
      disposedAt: sample.disposedAt,
      retestOf: sample.retestOf?.id ?? null,
      retests: sample.retests.map((r) => ({ id: r.id, type: r.type, status: r.status })),
      tests: sample.tests.map((t) => ({ name: t.name, status: t.status, result: t.result, unit: t.unit, spec: t.spec })),
      custodyEvents: sample.custodyEvents.map((c) => ({ label: c.label, time: c.time })),
      deviations: sample.deviations.map((d) => ({ description: d.description, status: d.status, openedAt: d.openedAt })),
      reports: sample.reports.map((r) => ({ fileName: r.fileName, uploadedAt: r.uploadedAt })),
    };
  },
};

const listSamples: ReadTool = {
  readonly: true,
  name: "list_samples",
  description:
    "List samples, optionally filtered by exact status (Pending Login, In Testing, Awaiting Supervisor Review, Awaiting QA Approval, Complete, Rejected) and/or free-text search. Use this for ANY question about which samples exist, how many are in a given status/stage, or an overview/listing of samples — get_overdue_samples only covers currently-open samples that are past due, it says nothing about how many are Complete or Rejected.",
  parameters: {
    type: "object",
    properties: {
      status: { type: "string", description: "Exact status to filter by, e.g. \"Complete\". Omit for all statuses." },
      search: { type: "string", description: "Free-text match against sample ID, name, type, or source." },
      limit: { type: "number", description: "Max rows to return, default 30, max 50." },
    },
    required: [],
  },
  run: async (args) => {
    const limit = Math.min(50, typeof args.limit === "number" && args.limit > 0 ? args.limit : 30);
    const search = args.search ? String(args.search) : "";
    const where = {
      ...(args.status ? { status: String(args.status) } : {}),
      ...(search
        ? {
            OR: [
              { id: { contains: search, mode: "insensitive" as const } },
              { name: { contains: search, mode: "insensitive" as const } },
              { type: { contains: search, mode: "insensitive" as const } },
              { source: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [total, samples] = await Promise.all([
      prisma.sample.count({ where }),
      prisma.sample.findMany({
        where,
        select: { id: true, name: true, type: true, status: true, receivedDate: true },
        orderBy: { receivedDate: "desc" },
        take: limit,
      }),
    ]);
    return { totalMatching: total, returned: samples.length, samples };
  },
};

const getSampleStatusBreakdown: ReadTool = {
  readonly: true,
  name: "get_sample_status_breakdown",
  description:
    "Get a count of ALL samples grouped by every status (Pending Login, In Testing, Awaiting Supervisor Review, Awaiting QA Approval, Complete, Rejected). Use this for \"how many samples are in each stage\" or \"give me an overview of samples\" type questions — much more efficient than calling list_samples once per status.",
  parameters: { type: "object", properties: {}, required: [] },
  run: async () => {
    const rows = await prisma.sample.groupBy({ by: ["status"], _count: { _all: true } });
    const total = rows.reduce((sum, r) => sum + r._count._all, 0);
    return { total, byStatus: Object.fromEntries(rows.map((r) => [r.status, r._count._all])) };
  },
};

const getDeviations: ReadTool = {
  readonly: true,
  name: "get_deviations",
  description: "List open or investigating deviations (OOS/CAPA records), each tied to a sample.",
  parameters: { type: "object", properties: {}, required: [] },
  run: async (_args, user) => {
    if (!canReviewAsSupervisor(user.accessRole)) return { error: "You don't have permission to view deviations." };
    const deviations = await prisma.deviation.findMany({
      where: { status: { not: "Closed" } },
      select: { id: true, sampleId: true, description: true, status: true, openedBy: true, openedAt: true },
      orderBy: { openedAt: "desc" },
      take: 20,
    });
    return { count: deviations.length, deviations };
  },
};

const getTechnicianPerformanceTool: ReadTool = {
  readonly: true,
  name: "get_technician_performance",
  description: "Get per-technician performance stats (tests submitted, on-time rate, out-of-spec rate) over the last N days (default 90).",
  parameters: { type: "object", properties: { days: { type: "number" } }, required: [] },
  run: async (args, user) => {
    if (!canViewAnalytics(user.accessRole)) return { error: "You don't have permission to view analytics." };
    const days = typeof args.days === "number" && args.days > 0 ? args.days : 90;
    const stats = await getTechnicianPerformance(days);
    return { count: stats.length, stats };
  },
};

const getTatPredictionsTool: ReadTool = {
  readonly: true,
  name: "get_tat_predictions",
  description: "Get predicted turnaround time per sample type, based on historical averages adjusted for the current open queue load.",
  parameters: { type: "object", properties: {}, required: [] },
  run: async (_args, user) => {
    if (!canViewAnalytics(user.accessRole)) return { error: "You don't have permission to view analytics." };
    const predictions = await getTatPredictions();
    return { predictions };
  },
};

const getEquipmentDetailTool: ReadTool = {
  readonly: true,
  name: "get_equipment_detail",
  description: "Get full detail for one equipment by its exact equipmentId, including its 5 most recent calibration/maintenance events.",
  parameters: { type: "object", properties: { equipmentId: { type: "string" } }, required: ["equipmentId"] },
  run: async (args, user) => {
    if (!canManageInventoryAndCatalog(user.accessRole)) return { error: "You don't have permission to view equipment." };
    const equipment = await prisma.equipment.findUnique({
      where: { id: String(args.equipmentId) },
      select: {
        id: true,
        name: true,
        assetTag: true,
        status: true,
        nextCalibrationDue: true,
        lastCalibratedAt: true,
        events: { orderBy: { performedAt: "desc" }, take: 5, select: { type: true, detail: true, performedAt: true, performedBy: true } },
      },
    });
    if (!equipment) return { found: false };
    return { found: true, ...equipment };
  },
};

const getReagentDetailTool: ReadTool = {
  readonly: true,
  name: "get_reagent_detail",
  description: "Get full detail for one reagent/chemical by its exact reagentId, including its 5 most recent stock movements.",
  parameters: { type: "object", properties: { reagentId: { type: "string" } }, required: ["reagentId"] },
  run: async (args, user) => {
    if (!canManageInventoryAndCatalog(user.accessRole)) return { error: "You don't have permission to view inventory." };
    const reagent = await prisma.reagent.findUnique({
      where: { id: String(args.reagentId) },
      select: {
        id: true,
        name: true,
        lotNumber: true,
        category: true,
        quantity: true,
        unit: true,
        minStockLevel: true,
        expiryDate: true,
        transactions: {
          orderBy: { performedAt: "desc" },
          take: 5,
          select: { type: true, quantityChange: true, quantityAfter: true, performedBy: true, performedAt: true },
        },
      },
    });
    if (!reagent) return { found: false };
    return { found: true, ...reagent };
  },
};

const listUsersTool: ReadTool = {
  readonly: true,
  name: "list_users",
  description: "List active lab staff accounts (name, job role, section, access level). Admin only.",
  parameters: { type: "object", properties: {}, required: [] },
  run: async (_args, user) => {
    if (!isAdmin(user.accessRole)) return { error: "Only Admins can view the user directory." };
    const users = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, employeeId: true, role: true, section: true, accessRole: true },
      orderBy: { name: "asc" },
    });
    return { count: users.length, users };
  },
};

const getMyNotificationsTool: ReadTool = {
  readonly: true,
  name: "get_my_notifications",
  description: "Get the current logged-in user's own unread notifications.",
  parameters: { type: "object", properties: {}, required: [] },
  run: async (_args, user) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id, unread: true },
      select: { id: true, title: true, body: true, sampleId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return { count: notifications.length, notifications };
  },
};

const listStorageLocations: ReadTool = {
  readonly: true,
  name: "list_storage_locations",
  description:
    "List warehouse storage locations (optionally filtered by name), with how many reagents and equipment are directly stored in each. Use this for \"where is X stored\" or \"what storage locations do we have\" type questions.",
  parameters: { type: "object", properties: { search: { type: "string" } }, required: [] },
  run: async (args, user) => {
    if (!canManageInventoryAndCatalog(user.accessRole)) return { error: "You don't have permission to view warehouse locations." };
    const search = args.search ? String(args.search) : "";
    const locations = await prisma.storageLocation.findMany({
      where: search ? { name: { contains: search, mode: "insensitive" } } : undefined,
      select: { id: true, name: true, active: true, _count: { select: { reagents: true, equipment: true } } },
      orderBy: { name: "asc" },
      take: 30,
    });
    return {
      count: locations.length,
      locations: locations.map((l) => ({ id: l.id, name: l.name, active: l.active, reagentCount: l._count.reagents, equipmentCount: l._count.equipment })),
    };
  },
};

const listBusinessUnits: ReadTool = {
  readonly: true,
  name: "list_business_units",
  description: "List business units (client/internal departments samples are logged against), with how many samples each has.",
  parameters: { type: "object", properties: {}, required: [] },
  run: async () => {
    const units = await prisma.businessUnit.findMany({
      select: { id: true, name: true, active: true, _count: { select: { samples: true } } },
      orderBy: { name: "asc" },
    });
    return { count: units.length, units: units.map((u) => ({ id: u.id, name: u.name, active: u.active, sampleCount: u._count.samples })) };
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

const logEquipmentMaintenance: WriteTool = {
  readonly: false,
  name: "log_equipment_maintenance",
  description:
    "Log a maintenance action performed on equipment (repairs, servicing — not a calibration). Call search_equipment first to resolve the exact equipmentId.",
  parameters: {
    type: "object",
    properties: {
      equipmentId: { type: "string" },
      detail: { type: "string", description: "What maintenance was performed" },
    },
    required: ["equipmentId", "detail"],
  },
  describe: async (args) => {
    const equipment = await prisma.equipment.findUnique({ where: { id: String(args.equipmentId) }, select: { name: true } });
    return `Log maintenance for ${equipment?.name ?? String(args.equipmentId)}: ${String(args.detail ?? "")}`;
  },
  run: async (args) => {
    const fd = new FormData();
    fd.set("id", String(args.equipmentId ?? ""));
    fd.set("detail", String(args.detail ?? ""));
    const result = await logMaintenanceAction({}, fd);
    if (result.error) return { ok: false, error: result.error };
    return { ok: true, message: "Maintenance logged." };
  },
};

const markSampleDisposed: WriteTool = {
  readonly: false,
  name: "mark_sample_disposed",
  description:
    "Mark a sample as physically disposed. Only works if the sample's status is Complete and it isn't already marked disposed — call get_sample_status first to check.",
  parameters: { type: "object", properties: { sampleId: { type: "string" } }, required: ["sampleId"] },
  describe: async (args) => {
    const sample = await prisma.sample.findUnique({ where: { id: String(args.sampleId) }, select: { name: true, type: true } });
    const label = sample?.name || sample?.type || String(args.sampleId);
    return `Mark sample ${String(args.sampleId)} (${label}) as disposed`;
  },
  run: async (args) => {
    const sampleId = String(args.sampleId ?? "");
    await markDisposedAction(sampleId);
    const after = await prisma.sample.findUnique({ where: { id: sampleId }, select: { disposedAt: true, status: true } });
    if (!after) return { ok: false, error: "Sample not found." };
    if (!after.disposedAt) {
      return { ok: false, error: `Couldn't mark disposed — sample must be Complete and not already disposed (current status: ${after.status}).` };
    }
    return { ok: true, message: "Marked disposed." };
  },
};

const approveSample: WriteTool = {
  readonly: false,
  name: "approve_sample",
  description:
    "Approve a sample at whichever review stage it's currently at (Supervisor review or QA approval — detected automatically). Call get_sample_status first to confirm it's actually awaiting review and that the requestor/details look right.",
  parameters: { type: "object", properties: { sampleId: { type: "string" } }, required: ["sampleId"] },
  needsPassword: true,
  describe: async (args) => {
    const sample = await prisma.sample.findUnique({ where: { id: String(args.sampleId) }, select: { name: true, type: true, status: true } });
    const label = sample?.name || sample?.type || String(args.sampleId);
    return `Approve ${label} (${String(args.sampleId)}) — currently "${sample?.status ?? "unknown"}"`;
  },
  run: async (args, user) => {
    const password = String(args.password ?? "");
    return approveSampleForAssistant(String(args.sampleId ?? ""), user, password);
  },
};

const rejectSample: WriteTool = {
  readonly: false,
  name: "reject_sample",
  description:
    "Reject a sample at whichever review stage it's currently at (Supervisor review or QA approval — detected automatically). This opens a deviation record automatically. Call get_sample_status first.",
  parameters: { type: "object", properties: { sampleId: { type: "string" } }, required: ["sampleId"] },
  needsPassword: true,
  describe: async (args) => {
    const sample = await prisma.sample.findUnique({ where: { id: String(args.sampleId) }, select: { name: true, type: true, status: true } });
    const label = sample?.name || sample?.type || String(args.sampleId);
    return `Reject ${label} (${String(args.sampleId)}) — currently "${sample?.status ?? "unknown"}"`;
  },
  run: async (args, user) => {
    const password = String(args.password ?? "");
    return rejectSampleForAssistant(String(args.sampleId ?? ""), user, password);
  },
};

export const AI_TOOLS: AnyTool[] = [
  getOverdueSamples,
  getSampleStatus,
  listSamples,
  getSampleStatusBreakdown,
  getDeviations,
  getTechnicianPerformanceTool,
  getTatPredictionsTool,
  getEquipmentDetailTool,
  getReagentDetailTool,
  listStorageLocations,
  listBusinessUnits,
  listUsersTool,
  getMyNotificationsTool,
  getLowStockReagents,
  searchReagentStock,
  searchEquipment,
  getUpcomingCalibrations,
  getAnalyticsSummary,
  recordReagentUsage,
  logEquipmentCalibration,
  logEquipmentMaintenance,
  changeEquipmentStatus,
  markSampleDisposed,
  approveSample,
  rejectSample,
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
