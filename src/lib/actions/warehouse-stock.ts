"use server";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { handleActionError } from "@/lib/userFacingError";
import { resolveMaterialName, WAREHOUSE_MATERIAL_NAMES } from "@/lib/warehouse-material-map";
import type { Prisma } from "@prisma/client";

export type WarehouseImportResult = { error?: string } | { ok: true; uploadId: string; rowCount: number };

// Persists a validated warehouse stock snapshot (plant "Stock Ending" export).
// The client already parsed + previewed the file and submits the final
// normalized rows as JSON along with the user-entered label/notes. The server
// re-validates the payload shape (never trusts the client blindly), creates
// the upload row + all item rows in a transaction, then audits it.
export async function importWarehouseStockAction(input: {
  label: string;
  notes?: string;
  fileName: string;
  rows: {
    location: string;
    productRef?: string;
    productName: string;
    lotNumber: string;
    vendorLotNumber?: string;
    vendorPackaging?: string;
    unit: string;
    quantity: number;
  }[];
}): Promise<WarehouseImportResult> {
  try {
    const user = await requireRole(canManageInventoryAndCatalog);
    const label = (input.label || "").trim();
    const fileName = (input.fileName || "upload").trim();
    const notes = (input.notes || "").trim() || null;
    const rows = Array.isArray(input.rows) ? input.rows : [];

    if (!label) return { error: "Period label is required (e.g. 0303 Stock Ending)." };
    if (rows.length === 0) return { error: "No rows to import." };
    if (rows.length > 50000) return { error: "Too many rows (max 50,000 per import)." };

    // Server-side re-validation of each row before persisting. The source
    // export regularly contains rows with an empty Lot Number / Unit (e.g.
    // packaging items like drums/pails, cleaning fluids), so only Location
    // and Product Name are truly required; empty Lot/Unit are stored as "".
    for (const r of rows) {
      const location = (r.location || "").trim();
      const productName = (r.productName || "").trim();
      if (!location || !productName) {
        return { error: "Every row needs at least Location and Product Name." };
      }
      if (r.quantity !== undefined && r.quantity !== null && !Number.isFinite(Number(r.quantity))) {
        return { error: `Quantity must be a number (row: ${productName}).` };
      }
    }

    const cleanedRows = rows.map((r) => ({
      location: (r.location || "").trim(),
      productRef: (r.productRef || "").trim() || null,
      productName: (r.productName || "").trim(),
      lotNumber: (r.lotNumber || "").trim(),
      vendorLotNumber: (r.vendorLotNumber || "").trim() || null,
      vendorPackaging: (r.vendorPackaging || "").trim() || null,
      unit: (r.unit || "").trim(),
      quantity: Number(r.quantity) || 0,
    }));

    const upload = await prisma.$transaction(async (tx) => {
      const created = await tx.warehouseStockUpload.create({
        data: {
          label,
          fileName,
          notes,
          rowCount: cleanedRows.length,
          importedBy: user.name,
          items: { create: cleanedRows },
        },
      });
      return created;
    });

    await logAudit({
      userId: user.id,
      action: "warehouse_stock.imported",
      entityType: "WarehouseStockUpload",
      entityId: upload.id,
      detail: `${label} — ${cleanedRows.length} rows from ${fileName}`,
    });

    revalidatePath("/inventory/warehouse-stock");
    return { ok: true, uploadId: upload.id, rowCount: cleanedRows.length };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function deleteWarehouseStockUploadAction(uploadId: string): Promise<{ error?: string } | { ok: true }> {
  try {
    const user = await requireRole(canManageInventoryAndCatalog);
    const existing = await prisma.warehouseStockUpload.findUnique({
      where: { id: uploadId },
      select: { id: true, label: true, rowCount: true, importedAt: true },
    });
    if (!existing) return { error: "Upload not found." };

    await prisma.warehouseStockUpload.delete({ where: { id: uploadId } });
    await logAudit({
      userId: user.id,
      action: "warehouse_stock.deleted",
      entityType: "WarehouseStockUpload",
      entityId: uploadId,
      detail: `${existing.label} (${existing.rowCount} rows, imported ${existing.importedAt.toISOString()})`,
    });
    revalidatePath("/inventory/warehouse-stock");
    return { ok: true };
  } catch (e) {
    return handleActionError(e);
  }
}

export type WarehouseExportRow = {
  location: string;
  productRef: string;
  productName: string;
  productCode: string;
  lotNumber: string;
  vendorLotNumber: string;
  vendorPackaging: string;
  unit: string;
  quantity: number;
};

// Full export of one upload snapshot (optionally filtered the same way the
// list page filters), uncapped — mirrors exportReagentsAction's on-demand
// pattern so "Export Excel" always covers the whole selected period.
export async function exportWarehouseStockAction(input: {
  uploadId: string;
  q?: string;
  loc?: string;
}): Promise<WarehouseExportRow[]> {
  await requireRole(canManageInventoryAndCatalog);
  const uploadId = (input.uploadId || "").trim();
  if (!uploadId) return [];

  const where: Prisma.WarehouseStockItemWhereInput = { uploadId };
  const q = (input.q || "").trim();
  if (q) {
    where.OR = [
      { productName: { contains: q, mode: "insensitive" } },
      { productRef: { contains: q, mode: "insensitive" } },
      { lotNumber: { contains: q, mode: "insensitive" } },
      { vendorLotNumber: { contains: q, mode: "insensitive" } },
    ];
    // Match resolved-name searches the same way the list page does.
    const qUpper = q.toUpperCase();
    const matchingCodes = Object.entries(WAREHOUSE_MATERIAL_NAMES)
      .filter(([, name]) => name.includes(qUpper))
      .map(([code]) => code);
    if (matchingCodes.length > 0) {
      where.OR.push({ productName: { in: matchingCodes } });
    }
  }
  const loc = (input.loc || "").trim();
  // Area filter matches the first path segment exactly (see list page).
  if (loc) where.location = { startsWith: `${loc}/` };

  const rows = await prisma.warehouseStockItem.findMany({
    where,
    orderBy: [{ productName: "asc" }, { lotNumber: "asc" }],
    take: 50000,
    select: {
      location: true,
      productRef: true,
      productName: true,
      lotNumber: true,
      vendorLotNumber: true,
      vendorPackaging: true,
      unit: true,
      quantity: true,
    },
  });

  return rows.map((r) => {
    const resolved = resolveMaterialName(r.productName);
    return {
      location: r.location,
      productRef: r.productRef ?? "",
      // Export shows the human-readable material name; the original Odoo code
      // travels as productCode so the Excel keeps a traceable Code column.
      productName: resolved,
      productCode: resolved !== r.productName ? r.productName : "",
      lotNumber: r.lotNumber,
      vendorLotNumber: r.vendorLotNumber ?? "",
      vendorPackaging: r.vendorPackaging ?? "",
      unit: r.unit,
      quantity: r.quantity,
    };
  });
}
