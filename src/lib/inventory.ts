import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { buildLocationTree, flattenForSelect, type LocationNode } from "@/lib/warehouse";

// Shared between the Reagents/Equipment list pages (paginated, current page
// only) and their "Export" actions (unpaginated, up to EXPORT_CAP rows) so
// the badge/stat logic and the location tree lookups live in exactly one
// place regardless of which caller needs them.

export const REAGENT_SOON_MS = 14 * 24 * 60 * 60 * 1000; // "expiring soon" window
export const EXPORT_CAP = 5000; // safety cap for on-demand full exports

export async function loadLocations() {
  const allLocations = await prisma.storageLocation.findMany({
    select: { id: true, name: true, parentId: true, active: true, notes: true },
  });
  const locationNodes: LocationNode[] = allLocations.map((l) => ({ ...l, directReagents: 0, directEquipment: 0 }));
  const locationTree = buildLocationTree(locationNodes);
  const locations = flattenForSelect(locationNodes, { activeOnly: true });
  return { locationNodes, locationTree, locations };
}

// Locations whose own name or full breadcrumb path (e.g. "KBI › Microbiology
// Lab › Rak X") matches a search term — used to let a text search also match
// items stored under a matching location, without needing a hierarchical
// text search at the SQL level (the location table is small/bounded, so
// filtering it in JS is cheap regardless of how large Reagent/Equipment get).
export function matchingLocationIds(locationTree: ReturnType<typeof buildLocationTree>, locationNodes: LocationNode[], q: string) {
  const lower = q.toLowerCase();
  return locationNodes.filter((l) => locationTree.pathFor(l.id).toLowerCase().includes(lower)).map((l) => l.id);
}

type ReagentStock = { quantity: number; minStockLevel: number; expiryDate: Date | null };

export function reagentBadge(r: ReagentStock, now: number, soonMs: number) {
  const lowStock = r.quantity <= r.minStockLevel;
  const expiringSoon = r.expiryDate && r.expiryDate.getTime() - now < soonMs;
  const expired = r.expiryDate && r.expiryDate.getTime() < now;
  if (expired) return { label: "Expired", bg: "#FDECEA", color: "#B00016" };
  if (lowStock) return { label: "Low stock", bg: "#FDECEA", color: "#B00016" };
  if (expiringSoon) return { label: "Expiring soon", bg: "#FEF3E0", color: "#9A6100" };
  return { label: "In stock", bg: "#E6F4EA", color: "#1E7A34" };
}

export function reagentStockPct(r: ReagentStock, now: number, soonMs: number) {
  const lowStock = r.quantity <= r.minStockLevel;
  const expiringSoon = r.expiryDate && r.expiryDate.getTime() - now < soonMs;
  const expired = r.expiryDate && r.expiryDate.getTime() < now;
  const reference = r.minStockLevel > 0 ? r.minStockLevel * 2 : r.quantity || 1;
  const pct = Math.max(4, Math.min(100, (r.quantity / reference) * 100));
  const color = expired || lowStock ? "#D0021B" : expiringSoon ? "#F5A623" : "#28A745";
  return { pct, color };
}

export function shapeReagentRow<T extends ReagentStock & { id: string; name: string; category: string; lotNumber: string; unit: string; locationId: string | null }>(
  r: T,
  locationTree: ReturnType<typeof buildLocationTree>,
  fallbackLocation: string | null,
  now: number,
  soonMs: number
) {
  const badge = reagentBadge(r, now, soonMs);
  const pct = reagentStockPct(r, now, soonMs);
  const locationName = r.locationId ? locationTree.pathFor(r.locationId) : fallbackLocation;
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    lotNumber: r.lotNumber,
    expiryLabel: r.expiryDate ? formatDate(r.expiryDate) : null,
    locationName: locationName || null,
    quantityLabel: `${r.quantity} ${r.unit}`,
    stockPct: pct.pct,
    stockColor: pct.color,
    badgeLabel: badge.label,
    badgeBg: badge.bg,
    badgeColor: badge.color,
  };
}

export const EQUIPMENT_STATUS_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  Operational: { bg: "#E6F4EA", color: "#1E7A34", dot: "#28A745" },
  "Under Maintenance": { bg: "#FEF3E0", color: "#9A6100", dot: "#F5A623" },
  "Out of Service": { bg: "#FDECEA", color: "#B00016", dot: "#D0021B" },
};

export function shapeEquipmentRow<T extends { id: string; assetTag: string; name: string; status: string; locationId: string | null; nextCalibrationDue: Date | null }>(
  e: T,
  locationTree: ReturnType<typeof buildLocationTree>,
  fallbackLocation: string | null,
  now: number
) {
  const overdue = Boolean(e.nextCalibrationDue && e.nextCalibrationDue.getTime() < now);
  const style = EQUIPMENT_STATUS_STYLE[e.status] ?? EQUIPMENT_STATUS_STYLE.Operational;
  const locationName = e.locationId ? locationTree.pathFor(e.locationId) : fallbackLocation;
  return {
    id: e.id,
    assetTag: e.assetTag,
    name: e.name,
    locationName: locationName || null,
    status: e.status,
    statusBg: style.bg,
    statusColor: style.color,
    statusDot: style.dot,
    calibrationLabel: e.nextCalibrationDue ? `${formatDate(e.nextCalibrationDue)}${overdue ? " (overdue)" : ""}` : null,
    overdue,
  };
}

// Reagent's "In stock / Low stock / Expiring soon / Expired" badge is
// derived from quantity vs. minStockLevel (a column-to-column comparison)
// plus expiryDate, so a table-wide breakdown can't be expressed as a plain
// Prisma `where`/`groupBy` — a single raw aggregate query avoids fetching
// every row just to count them client-side.
export async function getReagentStockStats() {
  const now = new Date();
  const soonDate = new Date(now.getTime() + REAGENT_SOON_MS);
  const rows = await prisma.$queryRaw<{ expired: bigint; low_stock: bigint; expiring_soon: bigint; total: bigint }[]>`
    SELECT
      COUNT(*) FILTER (WHERE "expiryDate" IS NOT NULL AND "expiryDate" < ${now}) AS expired,
      COUNT(*) FILTER (
        WHERE ("expiryDate" IS NULL OR "expiryDate" >= ${now})
          AND "quantity" <= "minStockLevel"
      ) AS low_stock,
      COUNT(*) FILTER (
        WHERE ("expiryDate" IS NULL OR "expiryDate" >= ${now})
          AND "quantity" > "minStockLevel"
          AND "expiryDate" IS NOT NULL AND "expiryDate" < ${soonDate}
      ) AS expiring_soon,
      COUNT(*) AS total
    FROM "Reagent"
  `;
  const row = rows[0];
  const expired = Number(row?.expired ?? 0);
  const lowStock = Number(row?.low_stock ?? 0);
  const expiringSoon = Number(row?.expiring_soon ?? 0);
  const total = Number(row?.total ?? 0);
  const inStock = total - expired - lowStock - expiringSoon;
  return { total, inStock, expiringSoon, lowStock, expired };
}

export async function getReagentCategories() {
  const rows = await prisma.reagent.findMany({ distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } });
  return rows.map((r) => r.category);
}

// Distinct storage locations actually in use, by locationId — the legacy
// free-text `location` fallback field (pre-dating the StorageLocation FK)
// is intentionally not counted here, matching how the FK is now the primary
// path for every new/edited row.
export async function getReagentLocationCount() {
  const rows = await prisma.reagent.groupBy({ by: ["locationId"], where: { locationId: { not: null } } });
  return rows.length;
}

export async function getEquipmentStatusStats() {
  const now = new Date();
  const [byStatus, overdue, total] = await Promise.all([
    prisma.equipment.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.equipment.count({ where: { nextCalibrationDue: { lt: now } } }),
    prisma.equipment.count(),
  ]);
  const counts: Record<string, number> = { Operational: 0, "Under Maintenance": 0, "Out of Service": 0 };
  for (const row of byStatus) counts[row.status] = row._count._all;
  return { total, operational: counts.Operational, underMaintenance: counts["Under Maintenance"], outOfService: counts["Out of Service"], overdue };
}

export async function getEquipmentLocationCount() {
  const rows = await prisma.equipment.groupBy({ by: ["locationId"], where: { locationId: { not: null } } });
  return rows.length;
}
