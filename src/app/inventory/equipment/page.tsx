import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { buildLocationTree, flattenForSelect } from "@/lib/warehouse";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import EquipmentListClient from "@/components/EquipmentListClient";

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

  const rows = equipment.map((e) => {
    const overdue = Boolean(e.nextCalibrationDue && e.nextCalibrationDue.getTime() < now);
    const style = STATUS_STYLE[e.status] ?? STATUS_STYLE.Operational;
    const locationName = e.storageLocation ? locationTree.pathFor(e.storageLocation.id) : e.location;
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
  });

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Equipment" backHref="/profile" hideDesktop />
      <EquipmentListClient equipment={rows} locations={locations} />
    </div>
  );
}
