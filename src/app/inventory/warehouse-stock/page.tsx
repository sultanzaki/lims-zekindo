import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { fetchCursorPage } from "@/lib/pagination";
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
  let locations: string[] = [];

  if (activeUploadId) {
    const where: Prisma.WarehouseStockItemWhereInput = { uploadId: activeUploadId };
    if (loc) where.location = { contains: loc, mode: "insensitive" };
    if (q) {
      where.OR = [
        { productName: { contains: q, mode: "insensitive" } },
        { productRef: { contains: q, mode: "insensitive" } },
        { lotNumber: { contains: q, mode: "insensitive" } },
        { vendorLotNumber: { contains: q, mode: "insensitive" } },
      ];
    }

    const [page, agg, locs] = await Promise.all([
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
      prisma.warehouseStockItem.aggregate({
        where: { uploadId: activeUploadId },
        _count: { _all: true },
        _sum: { quantity: true },
      }),
      prisma.warehouseStockItem.findMany({
        where: { uploadId: activeUploadId },
        distinct: ["location"],
        select: { location: true },
        orderBy: { location: "asc" },
      }),
    ]);
    itemRows = page.rows;
    pageInfo = page.pageInfo;
    const zeroQty = await prisma.warehouseStockItem.count({ where: { uploadId: activeUploadId, quantity: 0 } });
    const products = await prisma.warehouseStockItem.groupBy({
      by: ["productRef"],
      where: { uploadId: activeUploadId, productRef: { not: null } },
      _count: { _all: true },
    });
    stats = {
      rows: agg._count._all,
      products: products.length,
      locations: locs.length,
      zeroQty,
    };
    locations = locs.map((l) => l.location);
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
        items={itemRows.map((r) => ({
          id: r.id,
          location: r.location,
          productRef: r.productRef ?? "",
          productName: r.productName,
          lotNumber: r.lotNumber,
          vendorLotNumber: r.vendorLotNumber ?? "",
          vendorPackaging: r.vendorPackaging ?? "",
          unit: r.unit,
          quantity: r.quantity,
        }))}
        stats={stats}
        locations={locations}
        initialQuery={q}
        initialLocation={loc}
        pageInfo={pageInfo}
      />
    </div>
  );
}
