"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { uploadAttachment } from "@/lib/storage";

export type FormState = { error?: string };

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

async function uploadOptionalFile(
  file: FormDataEntryValue | null,
  pathPrefix: string
): Promise<{ fileName: string; fileType: string; fileSize: number; storagePath: string } | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("File is too large (max 10MB).");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${pathPrefix}/${randomUUID()}-${safeName}`;
  await uploadAttachment(storagePath, file);
  return { fileName: file.name, fileType: file.type, fileSize: file.size, storagePath };
}

// ---------- Reagents & Chemicals ----------

export async function createReagentAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "Reagent").trim() || "Reagent";
  const lotNumber = String(formData.get("lotNumber") || "").trim();
  const quantity = Number(formData.get("quantity") || 0);
  const unit = String(formData.get("unit") || "").trim();
  const minStockLevel = Number(formData.get("minStockLevel") || 0);
  const expiryDateRaw = String(formData.get("expiryDate") || "");
  const locationId = String(formData.get("locationId") || "").trim();

  if (!name || !lotNumber || !unit) return { error: "Name, lot number, and unit are required." };

  const created = await prisma.reagent.create({
    data: {
      name,
      category,
      lotNumber,
      quantity,
      unit,
      minStockLevel,
      expiryDate: expiryDateRaw ? new Date(expiryDateRaw) : null,
      locationId: locationId || null,
    },
  });

  if (quantity > 0) {
    await prisma.reagentTransaction.create({
      data: {
        reagentId: created.id,
        type: "RECEIVED",
        quantityChange: quantity,
        quantityAfter: quantity,
        reason: "Initial stock",
        performedBy: user.name,
      },
    });
  }

  await logAudit({ userId: user.id, action: "reagent.created", entityType: "Reagent", entityId: created.id, detail: name });
  revalidatePath("/inventory/reagents");
  revalidatePath("/inventory/warehouse");
  return {};
}

const REAGENT_TX_TYPES = ["RECEIVED", "CONSUMED", "ADJUSTED", "DISPOSED"] as const;
const REAGENT_TX_AUDIT: Record<(typeof REAGENT_TX_TYPES)[number], string> = {
  RECEIVED: "reagent.stock_received",
  CONSUMED: "reagent.stock_consumed",
  ADJUSTED: "reagent.stock_adjusted",
  DISPOSED: "reagent.stock_disposed",
};

export async function recordReagentTransactionAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const id = String(formData.get("id") || "");
  const typeRaw = String(formData.get("type") || "");
  const amountRaw = Number(formData.get("amount") || NaN);
  const reason = String(formData.get("reason") || "").trim();

  const type = REAGENT_TX_TYPES.find((t) => t === typeRaw);
  if (!type) return { error: "Choose a transaction type." };
  if (!Number.isFinite(amountRaw) || amountRaw < 0) return { error: "Enter a valid amount." };

  const reagent = await prisma.reagent.findUnique({ where: { id } });
  if (!reagent) return { error: "Reagent not found." };

  let quantityChange: number;
  if (type === "RECEIVED") {
    quantityChange = amountRaw;
  } else if (type === "ADJUSTED") {
    quantityChange = amountRaw - reagent.quantity;
  } else {
    // CONSUMED / DISPOSED
    if (amountRaw > reagent.quantity) return { error: `Only ${reagent.quantity} ${reagent.unit} available.` };
    quantityChange = -amountRaw;
  }
  const quantityAfter = Math.max(0, reagent.quantity + quantityChange);

  await prisma.$transaction([
    prisma.reagent.update({ where: { id }, data: { quantity: quantityAfter } }),
    prisma.reagentTransaction.create({
      data: {
        reagentId: id,
        type,
        quantityChange,
        quantityAfter,
        reason: reason || null,
        performedBy: user.name,
      },
    }),
  ]);

  await logAudit({ userId: user.id, action: REAGENT_TX_AUDIT[type], entityType: "Reagent", entityId: id, detail: `${quantityChange >= 0 ? "+" : ""}${quantityChange} ${reagent.unit}` });
  revalidatePath("/inventory/reagents");
  revalidatePath(`/inventory/reagents/${id}`);
  return {};
}

// ---------- Equipment ----------

export async function createEquipmentAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const name = String(formData.get("name") || "").trim();
  const assetTag = String(formData.get("assetTag") || "").trim();
  const locationId = String(formData.get("locationId") || "").trim();
  const lastCalibratedAtRaw = String(formData.get("lastCalibratedAt") || "");
  const nextCalibrationDueRaw = String(formData.get("nextCalibrationDue") || "");

  if (!name || !assetTag) return { error: "Name and asset tag are required." };

  const existing = await prisma.equipment.findUnique({ where: { assetTag } });
  if (existing) return { error: "Asset tag already in use." };

  const created = await prisma.equipment.create({
    data: {
      name,
      assetTag,
      locationId: locationId || null,
      lastCalibratedAt: lastCalibratedAtRaw ? new Date(lastCalibratedAtRaw) : null,
      nextCalibrationDue: nextCalibrationDueRaw ? new Date(nextCalibrationDueRaw) : null,
    },
  });

  await logAudit({ userId: user.id, action: "equipment.created", entityType: "Equipment", entityId: created.id, detail: name });
  revalidatePath("/inventory/equipment");
  revalidatePath("/inventory/warehouse");
  return {};
}

export async function changeEquipmentStatusAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  const reason = String(formData.get("reason") || "").trim();

  if (!["Operational", "Under Maintenance", "Out of Service"].includes(status)) {
    return { error: "Choose a valid status." };
  }

  const existing = await prisma.equipment.findUnique({ where: { id }, select: { status: true } });

  await prisma.$transaction([
    prisma.equipment.update({ where: { id }, data: { status } }),
    prisma.equipmentEvent.create({
      data: {
        equipmentId: id,
        type: "STATUS_CHANGE",
        detail: reason || `Status changed to ${status}`,
        performedBy: user.name,
      },
    }),
  ]);

  await logAudit({
    userId: user.id,
    action: "equipment.status_changed",
    entityType: "Equipment",
    entityId: id,
    detail: status,
    metadata: existing ? { status: { from: existing.status, to: status } } : undefined,
  });
  revalidatePath("/inventory/equipment");
  revalidatePath(`/inventory/equipment/${id}`);
  return {};
}

export async function logCalibrationAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const id = String(formData.get("id") || "");
  const nextCalibrationDueRaw = String(formData.get("nextCalibrationDue") || "");
  const result = String(formData.get("result") || "").trim();

  let attachment;
  try {
    attachment = await uploadOptionalFile(formData.get("certificate"), `equipment/${id}/calibration`);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }

  const nextDueAt = nextCalibrationDueRaw ? new Date(nextCalibrationDueRaw) : null;

  await prisma.$transaction([
    prisma.equipment.update({
      where: { id },
      data: { lastCalibratedAt: new Date(), nextCalibrationDue: nextDueAt, status: "Operational" },
    }),
    prisma.equipmentEvent.create({
      data: {
        equipmentId: id,
        type: "CALIBRATION",
        detail: result || null,
        performedBy: user.name,
        nextDueAt,
        attachmentFileName: attachment?.fileName,
        attachmentFileType: attachment?.fileType,
        attachmentFileSize: attachment?.fileSize,
        attachmentStoragePath: attachment?.storagePath,
      },
    }),
  ]);

  await logAudit({ userId: user.id, action: "equipment.calibration_logged", entityType: "Equipment", entityId: id });
  revalidatePath("/inventory/equipment");
  revalidatePath(`/inventory/equipment/${id}`);
  return {};
}

export async function logMaintenanceAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const id = String(formData.get("id") || "");
  const detail = String(formData.get("detail") || "").trim();
  if (!detail) return { error: "Describe what maintenance was performed." };

  let attachment;
  try {
    attachment = await uploadOptionalFile(formData.get("attachment"), `equipment/${id}/maintenance`);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed." };
  }

  await prisma.equipmentEvent.create({
    data: {
      equipmentId: id,
      type: "MAINTENANCE",
      detail,
      performedBy: user.name,
      attachmentFileName: attachment?.fileName,
      attachmentFileType: attachment?.fileType,
      attachmentFileSize: attachment?.fileSize,
      attachmentStoragePath: attachment?.storagePath,
    },
  });

  await logAudit({ userId: user.id, action: "equipment.maintenance_logged", entityType: "Equipment", entityId: id, detail });
  revalidatePath("/inventory/equipment");
  revalidatePath(`/inventory/equipment/${id}`);
  return {};
}
