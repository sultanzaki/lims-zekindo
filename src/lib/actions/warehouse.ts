"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canManageInventoryAndCatalog } from "@/lib/roles";

export type FormState = { error?: string };

export async function createStorageLocationAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole(canManageInventoryAndCatalog);
  const name = String(formData.get("name") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const parentIdRaw = String(formData.get("parentId") || "").trim();
  const parentId = parentIdRaw || null;

  if (!name) return { error: "Name is required." };

  if (parentId) {
    const parent = await prisma.storageLocation.findUnique({ where: { id: parentId } });
    if (!parent) return { error: "Parent location not found." };
  }

  const existing = await prisma.storageLocation.findFirst({ where: { parentId, name } });
  if (existing) return { error: "A location with that name already exists here." };

  const created = await prisma.storageLocation.create({ data: { name, notes: notes || null, parentId } });

  await logAudit({ userId: user.id, action: "warehouse.location_created", entityType: "StorageLocation", entityId: created.id, detail: name });

  revalidatePath("/inventory/warehouse");
  if (parentId) revalidatePath(`/inventory/warehouse/${parentId}`);
  revalidatePath("/inventory/reagents");
  revalidatePath("/inventory/equipment");
  return {};
}

export async function setStorageLocationActiveAction(id: string, active: boolean) {
  const user = await requireRole(canManageInventoryAndCatalog);
  await prisma.storageLocation.update({ where: { id }, data: { active } });
  await logAudit({ userId: user.id, action: active ? "warehouse.location_activated" : "warehouse.location_deactivated", entityType: "StorageLocation", entityId: id });
  revalidatePath("/inventory/warehouse");
  revalidatePath("/inventory/reagents");
  revalidatePath("/inventory/equipment");
}
