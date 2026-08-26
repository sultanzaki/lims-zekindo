"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { generatePortalToken } from "@/lib/tracking";

export type FormState = { error?: string };

export async function createSampleTypeAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const name = String(formData.get("name") || "").trim();
  const targetTatHours = Number(formData.get("targetTatHours") || 48);
  const retentionDays = Number(formData.get("retentionDays") || 30);

  if (!name) return { error: "Name is required." };

  const existing = await prisma.sampleTypeCatalog.findUnique({ where: { name } });
  if (existing) return { error: "That sample type already exists." };

  const created = await prisma.sampleTypeCatalog.create({
    data: { name, targetTatHours, retentionDays },
  });

  await logAudit({ userId: user.id, action: "catalog.sample_type_created", entityType: "SampleTypeCatalog", entityId: created.id, detail: name });

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

export async function createTestCatalogAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const sampleTypeId = String(formData.get("sampleTypeId") || "");
  const name = String(formData.get("name") || "").trim();
  const unit = String(formData.get("unit") || "").trim();
  const spec = String(formData.get("spec") || "").trim();
  const method = String(formData.get("method") || "").trim();
  const resultMode = String(formData.get("resultMode") || "SINGLE") === "MULTI" ? "MULTI" : "SINGLE";
  const replicateCountRaw = String(formData.get("replicateCount") || "").trim();
  const intervalPlanRaw = String(formData.get("intervalPlan") || "").trim();

  if (!sampleTypeId || !name || !spec) return { error: "Sample type, test name, and spec are required." };

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
    data: { sampleTypeId, name, unit, spec, method: method || null, order: count, resultMode, replicateCount, intervalPlan },
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

export async function createBusinessUnitAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Name is required." };

  const existing = await prisma.businessUnit.findUnique({ where: { name } });
  if (existing) return { error: "That business unit already exists." };

  const created = await prisma.businessUnit.create({ data: { name } });

  await logAudit({ userId: user.id, action: "catalog.business_unit_created", entityType: "BusinessUnit", entityId: created.id, detail: name });

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
