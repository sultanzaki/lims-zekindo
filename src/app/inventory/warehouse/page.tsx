import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { buildLocationTree, flattenForSelect } from "@/lib/warehouse";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import WarehouseToolbar from "@/components/WarehouseToolbar";
import WarehouseTree from "@/components/WarehouseTree";
import EmptyState from "@/components/ui/EmptyState";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Warehouse" };

export default async function WarehousePage() {
  const user = await requirePageRole(canManageInventoryAndCatalog);
  const [all, unread] = await Promise.all([
    prisma.storageLocation.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { reagents: true, equipment: true } } },
    }),
    getUnreadCount(user.id),
  ]);
  const nodes = all.map((l) => ({
    id: l.id,
    name: l.name,
    parentId: l.parentId,
    active: l.active,
    notes: l.notes,
    directReagents: l._count.reagents,
    directEquipment: l._count.equipment,
  }));
  const tree = buildLocationTree(nodes);
  const parentOptions = flattenForSelect(nodes);
  const activeLocations = nodes.filter((n) => n.active).length;
  const totalItems = nodes.reduce((sum, n) => sum + n.directReagents + n.directEquipment, 0);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Warehouse" backHref="/profile" hideDesktop />
      <div className="flex-1 px-5 md:px-9 pt-4.5 md:pt-7 pb-7 md:pb-9 flex flex-col gap-3.5 md:gap-5 md:max-w-[1400px] md:w-full">
        <WarehouseToolbar
          totalLocations={nodes.length}
          activeLocations={activeLocations}
          totalItems={totalItems}
          parentOptions={parentOptions}
        />

        {nodes.length > 0 ? <WarehouseTree tree={tree} /> : <EmptyState>No warehouse locations yet — add one above.</EmptyState>}
      </div>
    </div>
  );
}
