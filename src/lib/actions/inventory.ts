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
  const names = formData.getAll("name").map((v) => String(v).trim());
  const categories = formData.getAll("category").map((v) => String(v || "Reagent").trim() || "Reagent");
  const lotNumbers = formData.getAll("lotNumber").map((v) => String(v).trim());
  const quantities = formData.getAll("quantity").map((v) => Number(v || 0));
  const units = formData.getAll("unit").map((v) => String(v).trim());
  const minStockLevels = formData.getAll("minStockLevel").map((v) => Number(v || 0));
  const expiryDates = formData.getAll("expiryDate").map((v) => String(v || ""));
  const locationIds = formData.getAll("locationId").map((v) => String(v || "").trim());

  const rows = names.map((name, i) => ({
    name,
    category: categories[i] ?? "Reagent",
    lotNumber: lotNumbers[i] ?? "",
    quantity: quantities[i] ?? 0,
    unit: units[i] ?? "",
    minStockLevel: minStockLevels[i] ?? 0,
    expiryDate: expiryDates[i] ? new Date(expiryDates[i]) : null,
    locationId: locationIds[i] || null,
  }));

  if (rows.some((r) => !r.name || !r.lotNumber || !r.unit)) {
    return { error: "Name, lot number, and unit are required." };
  }

  for (const r of rows) {
    const created = await prisma.reagent.create({ data: r });

    if (r.quantity > 0) {
      await prisma.reagentTransaction.create({
        data: {
          reagentId: created.id,
          type: "RECEIVED",
          quantityChange: r.quantity,
          quantityAfter: r.quantity,
          reason: "Initial stock",
          performedBy: user.name,
        },
      });
    }

    await logAudit({ userId: user.id, action: "reagent.created", entityType: "Reagent", entityId: created.id, detail: r.name });
  }

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

export type BulkRelocateResult = { error: string } | { moved: number };

// Bulk-select on the Reagents list feeds this — moving a batch of items to a
// new (or cleared, when locationId is "") storage location in one action,
// the same "reorganizing a fridge" task that's currently one-item-at-a-time
// via the edit page. Each moved item still gets its own audit entry with a
// from/to diff, same as any other structured audit call site.
export async function bulkRelocateReagentsAction(ids: string[], locationId: string): Promise<BulkRelocateResult> {
  const user = await requireRole(canManageInventoryAndCatalog);
  if (ids.length === 0) return { error: "No reagents selected." };
  if (ids.length > 200) return { error: "Too many items selected at once (max 200)." };

  const targetLocationId = locationId || null;
  let targetLocationName = "Unassigned";
  if (targetLocationId) {
    const loc = await prisma.storageLocation.findUnique({ where: { id: targetLocationId }, select: { name: true } });
    if (!loc) return { error: "Choose a valid location." };
    targetLocationName = loc.name;
  }

  const existing = await prisma.reagent.findMany({
    where: { id: { in: ids } },
    select: { id: true, locationId: true, storageLocation: { select: { name: true } } },
  });

  let moved = 0;
  for (const r of existing) {
    if (r.locationId === targetLocationId) continue;
    await prisma.reagent.update({ where: { id: r.id }, data: { locationId: targetLocationId } });
    await logAudit({
      userId: user.id,
      action: "reagent.relocated",
      entityType: "Reagent",
      entityId: r.id,
      // Metadata is rendered verbatim in the Audit Log UI/CSV — use the
      // location's name, not its id, so the from/to diff is readable there.
      metadata: { location: { from: r.storageLocation?.name ?? "Unassigned", to: targetLocationName } },
    });
    moved++;
  }

  revalidatePath("/inventory/reagents");
  revalidatePath("/inventory/warehouse");
  return { moved };
}

// ---------- Equipment ----------

export async function createEquipmentAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const names = formData.getAll("name").map((v) => String(v).trim());
  const assetTags = formData.getAll("assetTag").map((v) => String(v).trim());
  const locationIds = formData.getAll("locationId").map((v) => String(v || "").trim());
  const nextCalibrationDues = formData.getAll("nextCalibrationDue").map((v) => String(v || ""));

  const rows = names.map((name, i) => ({
    name,
    assetTag: assetTags[i] ?? "",
    locationId: locationIds[i] || null,
    lastCalibratedAt: null as Date | null,
    nextCalibrationDue: nextCalibrationDues[i] ? new Date(nextCalibrationDues[i]) : null,
  }));

  if (rows.some((r) => !r.name || !r.assetTag)) return { error: "Name and asset tag are required." };

  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.assetTag)) return { error: `Asset tag "${r.assetTag}" was entered more than once.` };
    seen.add(r.assetTag);
  }

  const existing = await prisma.equipment.findMany({
    where: { assetTag: { in: rows.map((r) => r.assetTag) } },
    select: { assetTag: true },
  });
  if (existing.length > 0) return { error: `Asset tag "${existing[0].assetTag}" already in use.` };

  for (const r of rows) {
    const created = await prisma.equipment.create({ data: r });
    await logAudit({ userId: user.id, action: "equipment.created", entityType: "Equipment", entityId: created.id, detail: r.name });
  }

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

// Same bulk-relocate pattern as bulkRelocateReagentsAction above, for the
// Equipment list's bulk-select.
export async function bulkRelocateEquipmentAction(ids: string[], locationId: string): Promise<BulkRelocateResult> {
  const user = await requireRole(canManageInventoryAndCatalog);
  if (ids.length === 0) return { error: "No equipment selected." };
  if (ids.length > 200) return { error: "Too many items selected at once (max 200)." };

  const targetLocationId = locationId || null;
  let targetLocationName = "Unassigned";
  if (targetLocationId) {
    const loc = await prisma.storageLocation.findUnique({ where: { id: targetLocationId }, select: { name: true } });
    if (!loc) return { error: "Choose a valid location." };
    targetLocationName = loc.name;
  }

  const existing = await prisma.equipment.findMany({
    where: { id: { in: ids } },
    select: { id: true, locationId: true, storageLocation: { select: { name: true } } },
  });

  let moved = 0;
  for (const e of existing) {
    if (e.locationId === targetLocationId) continue;
    await prisma.equipment.update({ where: { id: e.id }, data: { locationId: targetLocationId } });
    await logAudit({
      userId: user.id,
      action: "equipment.relocated",
      entityType: "Equipment",
      entityId: e.id,
      // Metadata is rendered verbatim in the Audit Log UI/CSV — use the
      // location's name, not its id, so the from/to diff is readable there.
      metadata: { location: { from: e.storageLocation?.name ?? "Unassigned", to: targetLocationName } },
    });
    moved++;
  }

  revalidatePath("/inventory/equipment");
  revalidatePath("/inventory/warehouse");
  return { moved };
}
