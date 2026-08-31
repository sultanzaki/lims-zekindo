import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { buildLocationTree, flattenForSelect } from "@/lib/warehouse";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import ReagentsListClient from "@/components/ReagentsListClient";

type ReagentStock = { quantity: number; minStockLevel: number; expiryDate: Date | null };

function reagentBadge(r: ReagentStock, now: number, soonMs: number) {
  const lowStock = r.quantity <= r.minStockLevel;
  const expiringSoon = r.expiryDate && r.expiryDate.getTime() - now < soonMs;
  const expired = r.expiryDate && r.expiryDate.getTime() < now;
  if (expired) return { label: "Expired", bg: "#FDECEA", color: "#B00016" };
  if (lowStock) return { label: "Low stock", bg: "#FDECEA", color: "#B00016" };
  if (expiringSoon) return { label: "Expiring soon", bg: "#FEF3E0", color: "#9A6100" };
  return { label: "In stock", bg: "#E6F4EA", color: "#1E7A34" };
}

function reagentStockPct(r: ReagentStock, now: number, soonMs: number) {
  const lowStock = r.quantity <= r.minStockLevel;
  const expiringSoon = r.expiryDate && r.expiryDate.getTime() - now < soonMs;
  const expired = r.expiryDate && r.expiryDate.getTime() < now;
  const reference = r.minStockLevel > 0 ? r.minStockLevel * 2 : r.quantity || 1;
  const pct = Math.max(4, Math.min(100, (r.quantity / reference) * 100));
  const color = expired || lowStock ? "#D0021B" : expiringSoon ? "#F5A623" : "#28A745";
  return { pct, color };
}

export default async function ReagentsPage() {
  const user = await requirePageRole(canManageInventoryAndCatalog);
  const [reagents, allLocations, unread] = await Promise.all([
    prisma.reagent.findMany({ orderBy: { name: "asc" }, include: { storageLocation: true } }),
    prisma.storageLocation.findMany({ select: { id: true, name: true, parentId: true, active: true, notes: true } }),
    getUnreadCount(user.id),
  ]);
  const locationNodes = allLocations.map((l) => ({ ...l, directReagents: 0, directEquipment: 0 }));
  const locationTree = buildLocationTree(locationNodes);
  const locations = flattenForSelect(locationNodes, { activeOnly: true });
  const now = new Date().getTime();
  const soonMs = 14 * 24 * 60 * 60 * 1000;

  const rows = reagents.map((r) => {
    const badge = reagentBadge(r, now, soonMs);
    const pct = reagentStockPct(r, now, soonMs);
    const locationName = r.storageLocation ? locationTree.pathFor(r.storageLocation.id) : r.location;
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
  });

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Reagents & Chemicals" backHref="/profile" hideDesktop />
      <ReagentsListClient reagents={rows} locations={locations} />
    </div>
  );
}
