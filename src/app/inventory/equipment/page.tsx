import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { fetchCursorPage } from "@/lib/pagination";
import { loadLocations, matchingLocationIds, shapeEquipmentRow, getEquipmentStatusStats, getEquipmentLocationCount } from "@/lib/inventory";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import EquipmentListClient from "@/components/EquipmentListClient";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Equipment" };

const PAGE_SIZE = 50;

const SELECT = {
  id: true,
  assetTag: true,
  name: true,
  status: true,
  location: true,
  locationId: true,
  nextCalibrationDue: true,
} satisfies Prisma.EquipmentSelect;

const ORDER_BY: Prisma.EquipmentOrderByWithRelationInput[] = [{ name: "asc" }, { id: "asc" }];

export default async function EquipmentPage({ searchParams }: PageProps<"/inventory/equipment">) {
  const user = await requirePageRole(canManageInventoryAndCatalog);
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : "");

  const q = get("q").trim();
  const status = get("status");
  const after = get("after") || undefined;
  const before = get("before") || undefined;

  const { locationNodes, locationTree, locations } = await loadLocations();

  const where: Prisma.EquipmentWhereInput = {};
  if (status && status !== "All") where.status = status;
  if (q) {
    const locIds = matchingLocationIds(locationTree, locationNodes, q);
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { assetTag: { contains: q, mode: "insensitive" } },
      ...(locIds.length > 0 ? [{ locationId: { in: locIds } }] : []),
    ];
  }

  const [{ rows, pageInfo }, stats, locationCount, unread] = await Promise.all([
    fetchCursorPage(
      (args) => prisma.equipment.findMany({ where, select: SELECT, orderBy: ORDER_BY, ...args }),
      { after, before, pageSize: PAGE_SIZE }
    ),
    getEquipmentStatusStats(),
    getEquipmentLocationCount(),
    getUnreadCount(user.id),
  ]);

  const now = new Date().getTime();
  const equipmentRows = rows.map((e) => shapeEquipmentRow(e, locationTree, e.location, now));

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Equipment" backHref="/profile" hideDesktop />
      <EquipmentListClient
        equipment={equipmentRows}
        locations={locations}
        stats={stats}
        locationCount={locationCount}
        initialQuery={q}
        initialStatus={status || "All"}
        pageInfo={pageInfo}
      />
    </div>
  );
}
