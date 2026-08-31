import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { buildLocationTree, flattenForSelect } from "@/lib/warehouse";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import { CreateStorageLocationForm } from "@/components/WarehouseForms";
import WarehouseTree from "@/components/WarehouseTree";
import EmptyState from "@/components/ui/EmptyState";

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

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-64">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Warehouse" backHref="/profile" />
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-3.5 md:max-w-[1100px] md:mx-auto md:w-full">
        <p className="text-xs text-muted -mt-1">
          Physical storage locations shared by Reagents &amp; Chemicals and Equipment — nest them as deep as your lab is organized, e.g. KBI › Microbiology Lab › Rak X.
        </p>
        <CreateStorageLocationForm parentOptions={parentOptions} />

        {nodes.length > 0 ? <WarehouseTree tree={tree} /> : <EmptyState>No warehouse locations yet — add one above.</EmptyState>}
      </div>
    </div>
  );
}
