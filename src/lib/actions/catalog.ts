"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canManageInventoryAndCatalog } from "@/lib/roles";

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
