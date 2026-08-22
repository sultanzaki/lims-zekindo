"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canManageInventoryAndCatalog } from "@/lib/roles";

export type FormState = { error?: string };

export async function createReagentAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const name = String(formData.get("name") || "").trim();
  const lotNumber = String(formData.get("lotNumber") || "").trim();
  const quantity = Number(formData.get("quantity") || 0);
  const unit = String(formData.get("unit") || "").trim();
  const minStockLevel = Number(formData.get("minStockLevel") || 0);
  const expiryDateRaw = String(formData.get("expiryDate") || "");
  const location = String(formData.get("location") || "").trim();

  if (!name || !lotNumber || !unit) return { error: "Name, lot number, and unit are required." };

  const created = await prisma.reagent.create({
    data: {
      name,
      lotNumber,
      quantity,
      unit,
      minStockLevel,
      expiryDate: expiryDateRaw ? new Date(expiryDateRaw) : null,
      location: location || null,
    },
  });

  await logAudit({ userId: user.id, action: "reagent.created", entityType: "Reagent", entityId: created.id, detail: name });
  revalidatePath("/inventory/reagents");
  return {};
}

export async function updateReagentQuantityAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const id = String(formData.get("id") || "");
  const quantity = Number(formData.get("quantity") || 0);

  await prisma.reagent.update({ where: { id }, data: { quantity } });
  await logAudit({ userId: user.id, action: "reagent.quantity_updated", entityType: "Reagent", entityId: id, detail: String(quantity) });
  revalidatePath("/inventory/reagents");
  return {};
}

export async function createEquipmentAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const name = String(formData.get("name") || "").trim();
  const assetTag = String(formData.get("assetTag") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const lastCalibratedAtRaw = String(formData.get("lastCalibratedAt") || "");
  const nextCalibrationDueRaw = String(formData.get("nextCalibrationDue") || "");

  if (!name || !assetTag) return { error: "Name and asset tag are required." };

  const existing = await prisma.equipment.findUnique({ where: { assetTag } });
  if (existing) return { error: "Asset tag already in use." };

  const created = await prisma.equipment.create({
    data: {
      name,
      assetTag,
      location: location || null,
      lastCalibratedAt: lastCalibratedAtRaw ? new Date(lastCalibratedAtRaw) : null,
      nextCalibrationDue: nextCalibrationDueRaw ? new Date(nextCalibrationDueRaw) : null,
    },
  });

  await logAudit({ userId: user.id, action: "equipment.created", entityType: "Equipment", entityId: created.id, detail: name });
  revalidatePath("/inventory/equipment");
  return {};
}

export async function setEquipmentStatusAction(id: string, status: string) {
  const user = await requireRole(canManageInventoryAndCatalog);
  await prisma.equipment.update({ where: { id }, data: { status } });
  await logAudit({ userId: user.id, action: "equipment.status_changed", entityType: "Equipment", entityId: id, detail: status });
  revalidatePath("/inventory/equipment");
}

export async function logCalibrationAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const id = String(formData.get("id") || "");
  const nextCalibrationDueRaw = String(formData.get("nextCalibrationDue") || "");

  await prisma.equipment.update({
    where: { id },
    data: {
      lastCalibratedAt: new Date(),
      nextCalibrationDue: nextCalibrationDueRaw ? new Date(nextCalibrationDueRaw) : null,
      status: "Operational",
    },
  });

  await logAudit({ userId: user.id, action: "equipment.calibrated", entityType: "Equipment", entityId: id });
  revalidatePath("/inventory/equipment");
  return {};
}
