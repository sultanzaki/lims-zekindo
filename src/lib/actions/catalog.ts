"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { generatePortalToken } from "@/lib/tracking";
import { buildSpecLabel, parseOptionList, type ResultTypeConfig } from "@/lib/spec";

export type FormState = { error?: string };

export async function createSampleTypeAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const names = formData.getAll("name").map((v) => String(v).trim());
  const targetTatHoursList = formData.getAll("targetTatHours").map((v) => Number(v || 48));
  const retentionDaysList = formData.getAll("retentionDays").map((v) => Number(v || 30));

  const rows = names.map((name, i) => ({
    name,
    targetTatHours: targetTatHoursList[i] ?? 48,
    retentionDays: retentionDaysList[i] ?? 30,
  }));

  if (rows.some((r) => !r.name)) return { error: "Name is required." };

  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.name.toLowerCase())) return { error: `"${r.name}" was entered more than once.` };
    seen.add(r.name.toLowerCase());
  }

  const existing = await prisma.sampleTypeCatalog.findMany({
    where: { name: { in: rows.map((r) => r.name) } },
    select: { name: true },
  });
  if (existing.length > 0) return { error: `"${existing[0].name}" already exists.` };

  for (const r of rows) {
    const created = await prisma.sampleTypeCatalog.create({ data: r });
    await logAudit({ userId: user.id, action: "catalog.sample_type_created", entityType: "SampleTypeCatalog", entityId: created.id, detail: r.name });
  }

  revalidatePath("/admin/catalog");
  return {};
}

export async function setSampleTypeActiveAction(id: string, active: boolean) {
  const user = await requireRole(canManageInventoryAndCatalog);
  await prisma.sampleTypeCatalog.update({ where: { id }, data: { active } });
  await logAudit({ userId: user.id, action: active ? "catalog.sample_type_activated" : "catalog.sample_type_deactivated", entityType: "SampleTypeCatalog", entityId: id });
  revalidatePath("/admin/catalog");
}

function normalizeIntervalPlan(raw: string): string | null {
  const labels = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return labels.length > 0 ? labels.join(",") : null;
}

type ParsedResultType = { config: ResultTypeConfig; error?: string };

// Reads the Result Type sub-fields out of the Add Test form and validates
// them into a structured ResultTypeConfig. Every branch either returns a
// fully-populated config or an error the form can show — spec is never
// hand-typed for a new test definition, it's generated from this afterward.
function parseResultTypeFields(formData: FormData): ParsedResultType {
  const resultType = String(formData.get("resultType") || "NUMERIC");
  const empty: ResultTypeConfig = {
    resultType,
    numericMode: null,
    numericLimit: null,
    numericMin: null,
    numericMax: null,
    numericTarget: null,
    numericTolerance: null,
    categoricalOptions: null,
    categoricalPassOptions: null,
    categoricalOrdered: null,
  };

  if (resultType === "NUMERIC") {
    const numericMode = String(formData.get("numericMode") || "lte");
    const cfg: ResultTypeConfig = { ...empty, numericMode };
    if (numericMode === "lte" || numericMode === "gte") {
      const limit = Number(formData.get("numericLimit"));
      if (!Number.isFinite(limit)) return { config: cfg, error: "Enter a numeric limit." };
      cfg.numericLimit = limit;
    } else if (numericMode === "range") {
      const min = Number(formData.get("numericMin"));
      const max = Number(formData.get("numericMax"));
      if (!Number.isFinite(min) || !Number.isFinite(max)) return { config: cfg, error: "Enter both a minimum and a maximum." };
      if (min >= max) return { config: cfg, error: "The minimum must be less than the maximum." };
      cfg.numericMin = min;
      cfg.numericMax = max;
    } else if (numericMode === "target") {
      const target = Number(formData.get("numericTarget"));
      const tolerance = Number(formData.get("numericTolerance"));
      if (!Number.isFinite(target) || !Number.isFinite(tolerance)) return { config: cfg, error: "Enter both a target value and a tolerance." };
      if (tolerance < 0) return { config: cfg, error: "Tolerance can't be negative." };
      cfg.numericTarget = target;
      cfg.numericTolerance = tolerance;
    } else if (numericMode !== "info") {
      return { config: cfg, error: "Unknown numeric mode." };
    }
    return { config: cfg };
  }

  if (resultType === "CATEGORICAL") {
    const options = parseOptionList(String(formData.get("categoricalOptions") || ""));
    const passOptions = parseOptionList(String(formData.get("categoricalPassOptions") || ""));
    const ordered = formData.get("categoricalOrdered") === "on";
    const cfg: ResultTypeConfig = {
      ...empty,
      categoricalOptions: options.join(","),
      categoricalPassOptions: passOptions.join(","),
      categoricalOrdered: ordered,
    };
    if (options.length < 2) return { config: cfg, error: "List at least 2 options, comma-separated." };
    if (passOptions.length === 0) return { config: cfg, error: "Pick at least one option as a passing result." };
    const optionsLower = options.map((o) => o.toLowerCase());
    const unknown = passOptions.find((p) => !optionsLower.includes(p.toLowerCase()));
    if (unknown) return { config: cfg, error: `"${unknown}" isn't one of the listed options.` };
    return { config: cfg };
  }

  if (resultType === "TEXT") {
    return { config: empty };
  }

  return { config: empty, error: "Unknown result type." };
}

export async function createTestCatalogAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const sampleTypeId = String(formData.get("sampleTypeId") || "");
  const name = String(formData.get("name") || "").trim();
  const unit = String(formData.get("unit") || "").trim();
  const method = String(formData.get("method") || "").trim();
  const resultMode = String(formData.get("resultMode") || "SINGLE") === "MULTI" ? "MULTI" : "SINGLE";
  const replicateCountRaw = String(formData.get("replicateCount") || "").trim();
  const intervalPlanRaw = String(formData.get("intervalPlan") || "").trim();
  const requiresAttachment = formData.get("requiresAttachment") === "on";

  if (!sampleTypeId || !name) return { error: "Sample type and test name are required." };

  const { config, error: resultTypeError } = parseResultTypeFields(formData);
  if (resultTypeError) return { error: resultTypeError };
  const spec = buildSpecLabel(config, unit);

  let replicateCount: number | null = null;
  let intervalPlan: string | null = null;
  if (resultMode === "MULTI") {
    const n = Number(replicateCountRaw);
    replicateCount = Number.isFinite(n) && n >= 2 ? Math.floor(n) : null;
    intervalPlan = normalizeIntervalPlan(intervalPlanRaw);
    if (!replicateCount && !intervalPlan) {
      return { error: "Multiple Readings needs a replicate count (≥2) and/or an interval plan." };
    }
  }

  const count = await prisma.testCatalog.count({ where: { sampleTypeId } });
  const created = await prisma.testCatalog.create({
    data: {
      sampleTypeId,
      name,
      unit,
      spec,
      method: method || null,
      order: count,
      resultMode,
      replicateCount,
      intervalPlan,
      resultType: config.resultType,
      numericMode: config.numericMode,
      numericLimit: config.numericLimit,
      numericMin: config.numericMin,
      numericMax: config.numericMax,
      numericTarget: config.numericTarget,
      numericTolerance: config.numericTolerance,
      categoricalOptions: config.categoricalOptions,
      categoricalPassOptions: config.categoricalPassOptions,
      categoricalOrdered: config.categoricalOrdered,
      requiresAttachment: config.resultType === "TEXT" ? requiresAttachment : null,
    },
  });

  await logAudit({ userId: user.id, action: "catalog.test_created", entityType: "TestCatalog", entityId: created.id, detail: name });

  revalidatePath("/admin/catalog");
  return {};
}

export async function setTestCatalogActiveAction(id: string, active: boolean) {
  const user = await requireRole(canManageInventoryAndCatalog);
  await prisma.testCatalog.update({ where: { id }, data: { active } });
  await logAudit({ userId: user.id, action: active ? "catalog.test_activated" : "catalog.test_deactivated", entityType: "TestCatalog", entityId: id });
  revalidatePath("/admin/catalog");
}

export async function createTestPanelAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const name = String(formData.get("name") || "").trim();
  const testCatalogIds = formData.getAll("testCatalogIds").map((v) => String(v)).filter(Boolean);

  if (!name) return { error: "Name is required." };
  if (testCatalogIds.length === 0) return { error: "Select at least one test." };

  const existing = await prisma.testPanel.findUnique({ where: { name } });
  if (existing) return { error: "That test panel already exists." };

  const validCount = await prisma.testCatalog.count({ where: { id: { in: testCatalogIds } } });
  if (validCount !== testCatalogIds.length) return { error: "One or more selected tests are invalid." };

  const created = await prisma.testPanel.create({ data: { name, testCatalogIds } });

  await logAudit({
    userId: user.id,
    action: "catalog.test_panel_created",
    entityType: "TestPanel",
    entityId: created.id,
    detail: `${name} (${testCatalogIds.length} tests)`,
  });

  revalidatePath("/admin/catalog");
  revalidatePath("/samples/new");
  return {};
}

export async function setTestPanelActiveAction(id: string, active: boolean) {
  const user = await requireRole(canManageInventoryAndCatalog);
  await prisma.testPanel.update({ where: { id }, data: { active } });
  await logAudit({ userId: user.id, action: active ? "catalog.test_panel_activated" : "catalog.test_panel_deactivated", entityType: "TestPanel", entityId: id });
  revalidatePath("/admin/catalog");
  revalidatePath("/samples/new");
}

export async function createBusinessUnitAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const names = formData.getAll("name").map((v) => String(v).trim());
  if (names.some((n) => !n)) return { error: "Name is required." };

  const seen = new Set<string>();
  for (const n of names) {
    if (seen.has(n.toLowerCase())) return { error: `"${n}" was entered more than once.` };
    seen.add(n.toLowerCase());
  }

  const existing = await prisma.businessUnit.findMany({ where: { name: { in: names } }, select: { name: true } });
  if (existing.length > 0) return { error: `"${existing[0].name}" already exists.` };

  for (const name of names) {
    const created = await prisma.businessUnit.create({ data: { name } });
    await logAudit({ userId: user.id, action: "catalog.business_unit_created", entityType: "BusinessUnit", entityId: created.id, detail: name });
  }

  revalidatePath("/admin/catalog");
  revalidatePath("/samples/new");
  return {};
}

export async function setBusinessUnitActiveAction(id: string, active: boolean) {
  const user = await requireRole(canManageInventoryAndCatalog);
  await prisma.businessUnit.update({ where: { id }, data: { active } });
  await logAudit({ userId: user.id, action: active ? "catalog.business_unit_activated" : "catalog.business_unit_deactivated", entityType: "BusinessUnit", entityId: id });
  revalidatePath("/admin/catalog");
  revalidatePath("/samples/new");
}

// Client portal is opt-in per BU — enabling it is the one moment a token
// gets minted; every other read just looks one up, never generates one.
export async function enableBusinessUnitPortalAction(id: string) {
  const user = await requireRole(canManageInventoryAndCatalog);
  const token = generatePortalToken();
  await prisma.businessUnit.update({ where: { id }, data: { portalToken: token } });
  await logAudit({ userId: user.id, action: "catalog.business_unit_portal_enabled", entityType: "BusinessUnit", entityId: id });
  revalidatePath("/admin/business-units");
}

// Swaps in a fresh token, immediately invalidating the old link — the way
// to cut off a portal URL that was shared with the wrong person, without
// disturbing any other BU's portal or the per-sample tracking links.
export async function regenerateBusinessUnitPortalTokenAction(id: string) {
  const user = await requireRole(canManageInventoryAndCatalog);
  const token = generatePortalToken();
  await prisma.businessUnit.update({ where: { id }, data: { portalToken: token } });
  await logAudit({ userId: user.id, action: "catalog.business_unit_portal_regenerated", entityType: "BusinessUnit", entityId: id });
  revalidatePath("/admin/business-units");
}

export async function disableBusinessUnitPortalAction(id: string) {
  const user = await requireRole(canManageInventoryAndCatalog);
  await prisma.businessUnit.update({ where: { id }, data: { portalToken: null } });
  await logAudit({ userId: user.id, action: "catalog.business_unit_portal_disabled", entityType: "BusinessUnit", entityId: id });
  revalidatePath("/admin/business-units");
}
