"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canManageInventoryAndCatalog } from "@/lib/roles";

export type SearchResultItem = { id: string; title: string; subtitle: string; href: string };
export type SearchResultGroup = { label: string; items: SearchResultItem[] };

const MAX_PER_GROUP = 5;

/**
 * One search box across Sample, Equipment, Reagent/Chemical, and Storage
 * Location. Equipment/Reagent/Location groups are only included when the
 * logged-in user's role could actually open those pages anyway — search
 * must never surface a result behind a wall the user couldn't otherwise
 * open by navigating there directly.
 */
export async function globalSearchAction(rawQuery: string): Promise<SearchResultGroup[]> {
  const user = await requireUser();
  const query = rawQuery.trim();
  if (query.length < 2) return [];

  const canInventory = canManageInventoryAndCatalog(user.accessRole);

  const [samples, equipment, reagents, locations] = await Promise.all([
    prisma.sample.findMany({
      where: {
        OR: [
          { id: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { source: { contains: query, mode: "insensitive" } },
          { requestorName: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, type: true, status: true },
      take: MAX_PER_GROUP,
      orderBy: { createdAt: "desc" },
    }),
    canInventory
      ? prisma.equipment.findMany({
          where: {
            OR: [{ name: { contains: query, mode: "insensitive" } }, { assetTag: { contains: query, mode: "insensitive" } }],
          },
          select: { id: true, name: true, assetTag: true, status: true },
          take: MAX_PER_GROUP,
        })
      : Promise.resolve([]),
    canInventory
      ? prisma.reagent.findMany({
          where: {
            OR: [{ name: { contains: query, mode: "insensitive" } }, { lotNumber: { contains: query, mode: "insensitive" } }],
          },
          select: { id: true, name: true, lotNumber: true, category: true },
          take: MAX_PER_GROUP,
        })
      : Promise.resolve([]),
    canInventory
      ? prisma.storageLocation.findMany({
          where: { name: { contains: query, mode: "insensitive" } },
          select: { id: true, name: true },
          take: MAX_PER_GROUP,
        })
      : Promise.resolve([]),
  ]);

  const groups: SearchResultGroup[] = [];

  if (samples.length) {
    groups.push({
      label: "Samples",
      items: samples.map((s) => ({
        id: s.id,
        title: s.name || s.id,
        subtitle: `${s.type} · ${s.status}`,
        href: `/samples/${s.id}`,
      })),
    });
  }
  if (equipment.length) {
    groups.push({
      label: "Equipment",
      items: equipment.map((e) => ({
        id: e.id,
        title: e.name,
        subtitle: `${e.assetTag} · ${e.status}`,
        href: `/inventory/equipment/${e.id}`,
      })),
    });
  }
  if (reagents.length) {
    groups.push({
      label: "Reagents & Chemicals",
      items: reagents.map((r) => ({
        id: r.id,
        title: r.name,
        subtitle: `Lot ${r.lotNumber} · ${r.category}`,
        href: `/inventory/reagents/${r.id}`,
      })),
    });
  }
  if (locations.length) {
    groups.push({
      label: "Warehouse Locations",
      items: locations.map((l) => ({
        id: l.id,
        title: l.name,
        subtitle: "Storage location",
        href: `/inventory/warehouse/${l.id}`,
      })),
    });
  }

  return groups;
}
