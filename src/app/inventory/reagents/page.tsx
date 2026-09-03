import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { fetchCursorPage } from "@/lib/pagination";
import {
  REAGENT_SOON_MS,
  loadLocations,
  matchingLocationIds,
  shapeReagentRow,
  getReagentStockStats,
  getReagentCategories,
  getReagentLocationCount,
} from "@/lib/inventory";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import ReagentsListClient from "@/components/ReagentsListClient";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Reagents & Chemicals" };

const PAGE_SIZE = 50;

const SELECT = {
  id: true,
  name: true,
  category: true,
  lotNumber: true,
  quantity: true,
  unit: true,
  minStockLevel: true,
  expiryDate: true,
  location: true,
  locationId: true,
} satisfies Prisma.ReagentSelect;

const ORDER_BY: Prisma.ReagentOrderByWithRelationInput[] = [{ name: "asc" }, { id: "asc" }];

export default async function ReagentsPage({ searchParams }: PageProps<"/inventory/reagents">) {
  const user = await requirePageRole(canManageInventoryAndCatalog);
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : "");

  const q = get("q").trim();
  const category = get("category");
  const after = get("after") || undefined;
  const before = get("before") || undefined;

  const { locationNodes, locationTree, locations } = await loadLocations();

  const where: Prisma.ReagentWhereInput = {};
  if (category && category !== "All") where.category = category;
  if (q) {
    const locIds = matchingLocationIds(locationTree, locationNodes, q);
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { lotNumber: { contains: q, mode: "insensitive" } },
      ...(locIds.length > 0 ? [{ locationId: { in: locIds } }] : []),
    ];
  }

  const [{ rows, pageInfo }, stats, categories, locationCount, unread] = await Promise.all([
    fetchCursorPage(
      (args) => prisma.reagent.findMany({ where, select: SELECT, orderBy: ORDER_BY, ...args }),
      { after, before, pageSize: PAGE_SIZE }
    ),
    getReagentStockStats(),
    getReagentCategories(),
    getReagentLocationCount(),
    getUnreadCount(user.id),
  ]);

  const now = new Date().getTime();
  const reagentRows = rows.map((r) => shapeReagentRow(r, locationTree, r.location, now, REAGENT_SOON_MS));

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Reagents & Chemicals" backHref="/profile" hideDesktop />
      <ReagentsListClient
        reagents={reagentRows}
        locations={locations}
        categories={categories}
        stats={stats}
        locationCount={locationCount}
        initialQuery={q}
        initialCategory={category || "All"}
        pageInfo={pageInfo}
      />
    </div>
  );
}
