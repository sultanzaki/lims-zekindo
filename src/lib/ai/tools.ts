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
import {
  createSampleForAssistant,
  submitTestResultForAssistant,
  openDeviationForAssistant,
} from "@/lib/assistant/assistant-sample-actions";

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

// ---------- Read tools (auto-executed, never mutate anything) ----------

const getLabBriefing: ReadTool = {
  readonly: true,
  name: "get_lab_briefing",
  description:
    "One-call morning briefing / current-state snapshot of the whole lab: how many samples are open in each stage, what's overdue, how many await your review, low-stock or expiring reagents, equipment needing calibration, and open deviations. Use this for 'ringkasan kondisi lab', 'what needs attention', 'morning briefing', or 'apa yang harus saya kerjakan' — it returns everything in a single compact object instead of five separate calls.",
  parameters: { type: "object", properties: {}, required: [] },
  run: async (_args, user) => {
    const now = Date.now();
    const soonMs = 14 * 24 * 3600000;
    const OPEN = ["Pending Login", "In Testing", "Awaiting Supervisor Review", "Awaiting QA Approval"] as const;

    const [statusCounts, samples, reagents, equipment, deviations, myNotifications] = await Promise.all([
      prisma.sample.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.sample.findMany({
        where: { status: { in: [...OPEN] } },
        select: { id: true, name: true, type: true, status: true, receivedDate: true, sampleType: { select: { targetTatHours: true } } },
      }),
      prisma.reagent.findMany({ select: { id: true, name: true, quantity: true, unit: true, minStockLevel: true, expiryDate: true } }),
      prisma.equipment.findMany({ where: { nextCalibrationDue: { lt: new Date(now + soonMs) } }, select: { id: true, name: true, nextCalibrationDue: true } }),
      prisma.deviation.findMany({ where: { status: { not: "Closed" } }, select: { id: true, sampleId: true, description: true, status: true }, take: 10 }),
      prisma.notification.findMany({ where: { userId: user.id, unread: true }, select: { title: true, sampleId: true }, take: 10 }),
    ]);

    const overdue = samples
      .map((s) => {
        const targetHours = s.sampleType?.targetTatHours ?? 48;
        return { id: s.id, name: s.name, type: s.type, status: s.status, hoursOverdue: Math.round((now - s.receivedDate.getTime() - targetHours * 3600000) / 3600000) };
      })
      .filter((s) => s.hoursOverdue > 0)
      .sort((a, b) => b.hoursOverdue - a.hoursOverdue);

    const lowStock = reagents.filter((r) => r.quantity <= r.minStockLevel);
    const expiring = reagents.filter((r) => r.expiryDate && r.expiryDate.getTime() - now < soonMs);

    const byStatus: Record<string, number> = {};
    for (const s of samples) byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
    for (const row of statusCounts) byStatus[row.status] = row._count._all;

    return {
      openByStatus: byStatus,
      overdueCount: overdue.length,
      overdue: overdue.slice(0, 10),
      awaitingMyAction: samples.filter((s) => s.status === "Awaiting Supervisor Review" || s.status === "Awaiting QA Approval").length,
      lowStockCount: lowStock.length,
      lowStock: lowStock.slice(0, 8).map((r) => ({ name: r.name, quantity: `${r.quantity} ${r.unit}`, min: r.minStockLevel })),
      expiringSoonCount: expiring.length,
      expiringSoon: expiring.slice(0, 8).map((r) => ({ name: r.name, expiry: r.expiryDate })),
      calibrationsDueCount: equipment.length,
      calibrationsDue: equipment.slice(0, 8).map((e) => ({ name: e.name, due: e.nextCalibrationDue })),
      openDeviationsCount: deviations.length,
      myUnreadNotifications: myNotifications.length,
      notifications: myNotifications.slice(0, 5).map((n) => ({ title: n.title, sampleId: n.sampleId })),
    };
  },
};

const findSampleType: ReadTool = {
  readonly: true,
  name: "find_sample_type",
  description:
    "Search active sample types (e.g. 'Bottled Drinking Water', 'Cooling Water', 'Crude Glycerin') by name to get the exact sampleTypeId and its default test list. ALWAYS call this before proposing create_sample — never guess a sampleTypeId; create_sample needs the exact name.",
  parameters: { type: "object", properties: { query: { type: "string", description: "Sample type name to search, e.g. 'drinking water'" } }, required: ["query"] },
  run: async (args) => {
    const query = String(args.query ?? "");
    if (!query) return { error: "Enter a sample type name to search." };
    const types = await prisma.sampleTypeCatalog.findMany({
      where: { active: true, name: { contains: query, mode: "insensitive" } },
      select: { id: true, name: true, targetTatHours: true, retentionDays: true, _count: { select: { tests: true } } },
      orderBy: { name: "asc" },
      take: 8,
    });
    return { count: types.length, sampleTypes: types.map((t) => ({ sampleTypeId: t.id, name: t.name, targetTatHours: t.targetTatHours, defaultTestCount: t._count.tests })) };
  },
};

const getSampleTypesList: ReadTool = {
  readonly: true,
  name: "list_sample_types",
  description:
    "List ALL active sample types (names only + default test counts) when the user isn't sure what the exact type is called. Use find_sample_type when they have a name in mind.",
  parameters: { type: "object", properties: {}, required: [] },
  run: async () => {
    const types = await prisma.sampleTypeCatalog.findMany({
      where: { active: true },
      select: { id: true, name: true, targetTatHours: true },
      orderBy: { name: "asc" },
    });
    return { count: types.length, sampleTypes: types.map((t) => ({ sampleTypeId: t.id, name: t.name, targetTatHours: t.targetTatHours })) };
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

const createSample: WriteTool = {
  readonly: false,
  name: "create_sample",
  description:
    "Log in a NEW sample (creates the sample with status Pending Login and auto-assigns the sample type's default tests). Call find_sample_type or list_sample_types FIRST to get the exact sample type name — never guess it. If the user mentioned tests that are NOT in the type's defaults, note that extra tests must be added after creation.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "Sample name, e.g. 'Bottled Drinking Water 600ml - Batch A'" },
      sampleTypeName: { type: "string", description: "Exact sample type name as returned by find_sample_type" },
      source: { type: "string", description: "Where the sample came from, e.g. 'Production line 2'" },
      requestorName: { type: "string", description: "Who requested the test" },
      businessUnitName: { type: "string", description: "Client/department name, e.g. 'Marketing'" },
      collectedBy: { type: "string", description: "Who collected the sample (defaults to the current user)" },
      collectedDate: { type: "string", description: "ISO datetime when collected, e.g. 2026-09-05T08:00" },
      storageLocation: { type: "string", description: "Where the physical sample is stored" },
      priority: { type: "string", enum: ["Routine", "Urgent", "STAT"], description: "Default Routine" },
    },
    required: ["name", "sampleTypeName"],
  },
  describe: async (args) => {
    const priority = args.priority ? ` [${args.priority}]` : "";
    const requestor = args.requestorName ? `, requestor ${args.requestorName}` : "";
    return `Log in new sample "${args.name}" (type: ${args.sampleTypeName})${requestor}${priority}`;
  },
  run: async (args, user) => createSampleForAssistant(user, args as never),
};

const submitTestResult: WriteTool = {
  readonly: false,
  name: "submit_test_result",
  description:
    "Submit the result for ONE pending test on a sample (moves that test to awaiting-review). Resolves the test by exact name on the given sample — call get_sample_status first to confirm the sample exists, the test is still pending, and to see the unit/spec. This is a real result entry: never invent a value; only submit what the technician states.",
  parameters: {
    type: "object",
    properties: {
      sampleId: { type: "string", description: "e.g. LAB-24-0144" },
      testName: { type: "string", description: "Exact test name shown on the sample, e.g. 'Total Plate Count'" },
      result: { type: "string", description: "The numeric result with unit context or categorical value, e.g. '4.2e4' or 'Negative'" },
      notes: { type: "string", description: "Optional notes / observations" },
    },
    required: ["sampleId", "testName", "result"],
  },
  describe: async (args) => `Submit result "${args.result}" for test "${args.testName}" on ${args.sampleId}`,
  run: async (args, user) => submitTestResultForAssistant(user, args as never),
};

const openDeviation: WriteTool = {
  readonly: false,
  name: "open_deviation",
  description:
    "Open a deviation (OOS/CAPA observation) record against a sample. Use when a result is out of spec, something went wrong in testing, or the user wants to formally flag an issue for investigation.",
  parameters: {
    type: "object",
    properties: {
      sampleId: { type: "string", description: "e.g. LAB-24-0144" },
      description: { type: "string", description: "What deviated / the observation" },
      severity: { type: "string", enum: ["Low", "Medium", "High", "Critical"] },
      assigneeName: { type: "string", description: "Name of the person to own the investigation (search list_users first)" },
    },
    required: ["sampleId", "description"],
  },
  describe: async (args) => {
    const severity = args.severity ? ` [${args.severity}]` : "";
    return `Open deviation on ${args.sampleId}: ${String(args.description).slice(0, 80)}${severity}`;
  },
  run: async (args, user) => openDeviationForAssistant(user, args as never),
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
  getLabBriefing,
  findSampleType,
  getSampleTypesList,
  recordReagentUsage,
  logEquipmentCalibration,
  logEquipmentMaintenance,
  changeEquipmentStatus,
  markSampleDisposed,
  approveSample,
  rejectSample,
  createSample,
  submitTestResult,
  openDeviation,
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
