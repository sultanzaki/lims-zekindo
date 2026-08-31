import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { buildLocationTree, flattenForSelect } from "@/lib/warehouse";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import { CreateEquipmentForm } from "@/components/InventoryForms";
import EmptyState from "@/components/ui/EmptyState";
import Chevron from "@/components/ui/Chevron";

const STATUS_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  Operational: { bg: "#E6F4EA", color: "#1E7A34", dot: "#28A745" },
  "Under Maintenance": { bg: "#FEF3E0", color: "#9A6100", dot: "#F5A623" },
  "Out of Service": { bg: "#FDECEA", color: "#B00016", dot: "#D0021B" },
};

export default async function EquipmentPage() {
  const user = await requirePageRole(canManageInventoryAndCatalog);
  const [equipment, allLocations, unread] = await Promise.all([
    prisma.equipment.findMany({ orderBy: { name: "asc" }, include: { storageLocation: true } }),
    prisma.storageLocation.findMany({ select: { id: true, name: true, parentId: true, active: true, notes: true } }),
    getUnreadCount(user.id),
  ]);
  const locationNodes = allLocations.map((l) => ({ ...l, directReagents: 0, directEquipment: 0 }));
  const locationTree = buildLocationTree(locationNodes);
  const locations = flattenForSelect(locationNodes, { activeOnly: true });
  const now = new Date().getTime();

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Equipment" backHref="/profile" />
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-3.5 md:max-w-[1100px] md:mx-auto md:w-full">
        <CreateEquipmentForm locations={locations} />

        <div className="flex flex-col gap-2.5">
          {equipment.map((e) => {
            const overdue = e.nextCalibrationDue && e.nextCalibrationDue.getTime() < now;
            const style = STATUS_STYLE[e.status] ?? STATUS_STYLE.Operational;
            const locationName = e.storageLocation ? locationTree.pathFor(e.storageLocation.id) : e.location;
            return (
              <Link
                key={e.id}
                href={`/inventory/equipment/${e.id}`}
                className="bg-white border border-border rounded-[18px] shadow-card px-4 py-3.5"
              >
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: style.dot }} />
                    <span className="text-xs font-semibold text-muted font-mono-data truncate">{e.assetTag}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                      style={{ background: style.bg, color: style.color }}
                    >
                      {e.status}
                    </span>
                    <Chevron />
                  </div>
                </div>
                <div className="text-[15px] font-semibold text-text mt-2 leading-snug tracking-tight">{e.name}</div>
                <div className="text-[13px] text-muted mt-0.5">{locationName || "—"}</div>
                {e.nextCalibrationDue && (
                  <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-border-soft">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={overdue ? "#D0021B" : "#7A8B94"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <path d="M8 3v4" />
                      <path d="M16 3v4" />
                      <path d="M3 10h18" />
                    </svg>
                    <span className="text-xs font-semibold" style={{ color: overdue ? "#D0021B" : "#7A8B94" }}>
                      Calibration due {formatDate(e.nextCalibrationDue)} {overdue && "(overdue)"}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
          {equipment.length === 0 && <EmptyState>No equipment tracked yet.</EmptyState>}
        </div>
      </div>
    </div>
  );
}
