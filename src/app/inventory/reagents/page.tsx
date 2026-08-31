import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { buildLocationTree, flattenForSelect } from "@/lib/warehouse";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import { CreateReagentForm } from "@/components/InventoryForms";
import EmptyState from "@/components/ui/EmptyState";

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

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Reagents & Chemicals" backHref="/profile" />
      <div className="flex-1 px-5 md:px-8 pt-4.5 pb-7 flex flex-col gap-3.5 md:max-w-[1400px] md:mx-auto md:w-full">
        <div className="md:max-w-[640px]">
          <CreateReagentForm locations={locations} />
        </div>

        <div className="flex flex-col gap-2.5 md:hidden">
          {reagents.map((r) => {
            const badge = reagentBadge(r, now, soonMs);
            const pct = reagentStockPct(r, now, soonMs);
            const locationName = r.storageLocation ? locationTree.pathFor(r.storageLocation.id) : r.location;
            return (
              <Link key={r.id} href={`/inventory/reagents/${r.id}`} className="bg-white border border-border rounded-2xl shadow-card-sm px-4 py-3.5 block">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-text leading-snug">{r.name}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-chip-bg text-muted shrink-0">{r.category}</span>
                    </div>
                    <div className="text-xs text-muted mt-0.5 font-mono-data">
                      Lot {r.lotNumber} {r.expiryDate && `· exp ${formatDate(r.expiryDate)}`}
                      {locationName && ` · ${locationName}`}
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 mt-3">
                  <div className="flex-1 h-[7px] rounded-full bg-[#EEF2F5] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct.pct}%`, background: pct.color }} />
                  </div>
                  <span className="text-xs font-semibold text-[#444] font-mono-data whitespace-nowrap">
                    {r.quantity} {r.unit}
                  </span>
                </div>
              </Link>
            );
          })}
          {reagents.length === 0 && <EmptyState>No reagents tracked yet.</EmptyState>}
        </div>

        <div className="hidden md:block">
          {reagents.length === 0 ? (
            <EmptyState>No reagents tracked yet.</EmptyState>
          ) : (
            <div className="bg-white border border-border rounded-2xl shadow-card-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-soft">
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-4">Name</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Lot</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Expiry</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Location</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Stock</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reagents.map((r) => {
                    const badge = reagentBadge(r, now, soonMs);
                    const pct = reagentStockPct(r, now, soonMs);
                    const locationName = r.storageLocation ? locationTree.pathFor(r.storageLocation.id) : r.location;
                    return (
                      <tr key={r.id} className="border-b border-border-soft last:border-b-0 hover:bg-chip-bg transition-colors">
                        <td className="py-2.5 px-4">
                          <Link href={`/inventory/reagents/${r.id}`} className="text-[13px] font-semibold text-primary-dark hover:underline">
                            {r.name}
                          </Link>
                          <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-chip-bg text-muted">{r.category}</span>
                        </td>
                        <td className="py-2.5 px-3 text-[13px] text-muted font-mono-data">{r.lotNumber}</td>
                        <td className="py-2.5 px-3 text-[13px] text-muted font-mono-data whitespace-nowrap">
                          {r.expiryDate ? formatDate(r.expiryDate) : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-[13px] text-muted truncate max-w-[160px]">{locationName || "—"}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2 w-[140px]">
                            <div className="flex-1 h-[6px] rounded-full bg-[#EEF2F5] overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct.pct}%`, background: pct.color }} />
                            </div>
                            <span className="text-[12px] font-semibold text-[#444] font-mono-data whitespace-nowrap">
                              {r.quantity} {r.unit}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 pr-4">
                          <span
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
