import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { buildLocationTree, flattenForSelect } from "@/lib/warehouse";
import BackHeader from "@/components/BackHeader";
import { CreateStorageLocationForm } from "@/components/WarehouseForms";
import { setStorageLocationActiveAction } from "@/lib/actions/warehouse";
import EmptyState from "@/components/ui/EmptyState";
import Chevron from "@/components/ui/Chevron";

export default async function WarehousePage() {
  await requirePageRole(canManageInventoryAndCatalog);
  const all = await prisma.storageLocation.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { reagents: true, equipment: true } } },
  });
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
  const roots = tree.childrenOf(null);
  const parentOptions = flattenForSelect(nodes);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg">
      <BackHeader title="Warehouse" backHref="/profile" />
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-3.5">
        <p className="text-xs text-muted -mt-1">
          Physical storage locations shared by Reagents &amp; Chemicals and Equipment — nest them as deep as your lab is organized, e.g. KBI › Microbiology Lab › Rak X.
        </p>
        <CreateStorageLocationForm parentOptions={parentOptions} />

        <div className="flex flex-col gap-2.5">
          {roots.map((loc) => {
            const itemCount = tree.totalItems(loc.id);
            const subCount = tree.subLocationCount(loc.id);
            return (
              <div key={loc.id} className="bg-white border border-border rounded-[18px] shadow-card px-4 py-3.5 flex items-center gap-3">
                <Link href={`/inventory/warehouse/${loc.id}`} className="flex-1 min-w-0 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-primary-soft flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2B8DB8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-text truncate">{loc.name}</span>
                      {!loc.active && <span className="text-[10px] font-semibold text-danger shrink-0">(inactive)</span>}
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {subCount > 0 && `${subCount} sub-location${subCount === 1 ? "" : "s"} · `}
                      {itemCount} item{itemCount === 1 ? "" : "s"} stored
                      {loc.notes && ` · ${loc.notes}`}
                    </div>
                  </div>
                </Link>
                <form action={setStorageLocationActiveAction.bind(null, loc.id, !loc.active)} className="shrink-0">
                  <button
                    type="submit"
                    className={`text-[11px] font-semibold cursor-pointer ${loc.active ? "text-danger" : "text-success-dark"}`}
                  >
                    {loc.active ? "Deactivate" : "Reactivate"}
                  </button>
                </form>
                <Link href={`/inventory/warehouse/${loc.id}`} className="shrink-0" aria-label={`View ${loc.name}`}>
                  <Chevron />
                </Link>
              </div>
            );
          })}
          {roots.length === 0 && <EmptyState>No warehouse locations yet — add one above.</EmptyState>}
        </div>
      </div>
    </div>
  );
}
