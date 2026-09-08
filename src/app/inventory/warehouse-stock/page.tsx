import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { fetchCursorPage } from "@/lib/pagination";
import { resolveMaterialName, WAREHOUSE_MATERIAL_NAMES } from "@/lib/warehouse-material-map";
import Sidebar from "@/components/Sidebar";
import BackHeader from "@/components/BackHeader";
import WarehouseStockClient from "@/components/WarehouseStockClient";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Warehouse Stock" };

const PAGE_SIZE = 100;
const SELECT = {
  id: true,
  location: true,
  productRef: true,
  productName: true,
  lotNumber: true,
  vendorLotNumber: true,
  vendorPackaging: true,
  unit: true,
  quantity: true,
} satisfies Prisma.WarehouseStockItemSelect;

// One raw aggregate for all the header stats + the area filter options.
// A single scan replaces the previous 5 sequential queries (aggregate,
// distinct locations, zero-stock count, product-ref groupBy) and returns
// only top-level areas for the dropdown instead of every full location path.
async function getSnapshotStats(uploadId: string) {
  const rows = await prisma.$queryRaw<
    {
      total: bigint;
      products: bigint;
      locations: bigint;
      zero_qty: bigint;
      areas: string[];
    }[]
  >`
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(DISTINCT "productRef")::bigint AS products,
      COUNT(DISTINCT "location")::bigint AS locations,
      COUNT(*) FILTER (WHERE "quantity" = 0)::bigint AS zero_qty,
      COALESCE(ARRAY_AGG(DISTINCT SPLIT_PART("location", '/', 1)), '{}') AS areas
    FROM "WarehouseStockItem"
    WHERE "uploadId" = ${uploadId}
  `;
  const r = rows[0];
  return {
    total: Number(r?.total ?? 0),
    products: Number(r?.products ?? 0),
    locations: Number(r?.locations ?? 0),
    zeroQty: Number(r?.zero_qty ?? 0),
    areas: (r?.areas ?? []).filter(Boolean).sort(),
  };
}

export default async function WarehouseStockPage({ searchParams }: PageProps<"/inventory/warehouse-stock">) {
  const user = await requirePageRole(canManageInventoryAndCatalog);
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : "");
  const q = get("q").trim();
  const loc = get("loc").trim();
  const uploadId = get("upload");
  const after = get("after") || undefined;
  const before = get("before") || undefined;

  const [uploads, unread] = await Promise.all([
    prisma.warehouseStockUpload.findMany({
      orderBy: { importedAt: "desc" },
      select: { id: true, label: true, fileName: true, rowCount: true, importedBy: true, importedAt: true },
      take: 50,
    }),
    getUnreadCount(user.id),
  ]);

  // Default to the most recent upload when none is selected.
  const activeUploadId = uploadId && uploads.some((u) => u.id === uploadId) ? uploadId : uploads[0]?.id ?? "";
  const activeUpload = uploads.find((u) => u.id === activeUploadId) ?? null;

  let itemRows: Prisma.WarehouseStockItemGetPayload<{ select: typeof SELECT }>[] = [];
  let pageInfo = { hasNext: false, hasPrev: false, nextCursor: null as string | null, prevCursor: null as string | null };
  let stats = { rows: 0, products: 0, locations: 0, zeroQty: 0 };
  let areas: string[] = [];

  if (activeUploadId) {
    const where: Prisma.WarehouseStockItemWhereInput = { uploadId: activeUploadId };
    // Area filter matches the FIRST path segment exactly (locations look like
    // "AREA/..."), so selecting "KBI" does not also pull "OH-OS/Stock/KBI …".
    if (loc) where.location = { startsWith: `${loc}/` };
    if (q) {
      where.OR = [
        { productName: { contains: q, mode: "insensitive" } },
        { productRef: { contains: q, mode: "insensitive" } },
        { lotNumber: { contains: q, mode: "insensitive" } },
        { vendorLotNumber: { contains: q, mode: "insensitive" } },
      ];
      // If the query looks like a material display name (e.g. "EDTA", "OLEIC
      // ACID"), also match rows whose Odoo code maps to it — so searching a
      // resolved name still finds the coded rows. Cheap because the map is
      // small and built once per request.
      const qUpper = q.toUpperCase();
      const matchingCodes = Object.entries(WAREHOUSE_MATERIAL_NAMES)
        .filter(([, name]) => name.includes(qUpper))
        .map(([code]) => code);
      if (matchingCodes.length > 0) {
        where.OR.push({ productName: { in: matchingCodes } });
      }
    }

    // Rows + stats run concurrently (single round-trip each, no serial chain).
    const [{ rows, pageInfo: pi }, agg] = await Promise.all([
      fetchCursorPage(
        (args) =>
          prisma.warehouseStockItem.findMany({
            where,
            select: SELECT,
            orderBy: [{ productName: "asc" }, { lotNumber: "asc" }],
            ...args,
          }),
        { after, before, pageSize: PAGE_SIZE }
      ),
      // The raw aggregate only counts the active upload; if the user filtered
      // by area/q, the chip totals still describe the whole snapshot while
      // rows are the filtered set (same as before).
      getSnapshotStats(activeUploadId),
    ]);
    itemRows = rows;
    pageInfo = pi;
    stats = { rows: agg.total, products: agg.products, locations: agg.locations, zeroQty: agg.zeroQty };
    areas = agg.areas;
  }

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Warehouse Stock" backHref="/profile" hideDesktop />
      <WarehouseStockClient
        uploads={uploads.map((u) => ({
          id: u.id,
          label: u.label,
          fileName: u.fileName,
          rowCount: u.rowCount,
          importedBy: u.importedBy,
          importedAt: u.importedAt.toISOString(),
        }))}
        activeUploadId={activeUploadId}
        activeUploadLabel={activeUpload?.label ?? ""}
        items={itemRows.map((r) => {
          const rawName = r.productName;
          const resolved = resolveMaterialName(rawName);
          return {
            id: r.id,
            location: r.location,
            productRef: r.productRef ?? "",
            // Display name: human-readable material name when the Odoo code
            // is known; otherwise the original (finished goods, packaging).
            productName: resolved,
            // Original code kept for the small caption under the name.
            productCode: resolved !== rawName ? rawName : "",
            lotNumber: r.lotNumber,
            vendorLotNumber: r.vendorLotNumber ?? "",
            vendorPackaging: r.vendorPackaging ?? "",
            unit: r.unit,
            quantity: r.quantity,
          };
        })}
        stats={stats}
        locations={areas}
        initialQuery={q}
        initialLocation={loc}
        pageInfo={pageInfo}
      />
    </div>
  );
}
