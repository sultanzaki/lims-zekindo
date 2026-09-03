import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { buildLocationTree, flattenForSelect } from "@/lib/warehouse";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import { CreateStorageLocationForm } from "@/components/WarehouseForms";
import { setStorageLocationActiveAction } from "@/lib/actions/warehouse";
import SectionLabel from "@/components/ui/SectionLabel";
import EmptyState from "@/components/ui/EmptyState";
import Chevron from "@/components/ui/Chevron";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const location = await prisma.storageLocation.findUnique({ where: { id }, select: { name: true } });
  return { title: location?.name ?? "Location" };
}
import LinkButton from "@/components/ui/LinkButton";

export default async function StorageLocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageRole(canManageInventoryAndCatalog);
  const { id } = await params;

  const [location, all, unread] = await Promise.all([
    prisma.storageLocation.findUnique({
      where: { id },
      include: {
        reagents: { orderBy: { name: "asc" } },
        equipment: { orderBy: { name: "asc" } },
      },
    }),
    prisma.storageLocation.findMany({ include: { _count: { select: { reagents: true, equipment: true } } } }),
    getUnreadCount(user.id),
  ]);
  if (!location) notFound();

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
  const ancestors = tree.ancestorsOf(id);
  const children = tree.childrenOf(id);
  const parentOptions = flattenForSelect(nodes, { excludeId: id });

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title={location.name} backHref={ancestors.length > 0 ? `/inventory/warehouse/${ancestors[ancestors.length - 1].id}` : "/inventory/warehouse"} />
      <div className="flex-1 px-5 md:px-8 pt-4.5 pb-7 flex flex-col gap-4 md:max-w-[720px] md:w-full">
        {ancestors.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted -mt-1 flex-wrap">
            <Link href="/inventory/warehouse" className="hover:text-primary">
              Warehouse
            </Link>
            {ancestors.map((a) => (
              <span key={a.id} className="flex items-center gap-1">
                <span className="text-faint">›</span>
                <Link href={`/inventory/warehouse/${a.id}`} className="hover:text-primary">
                  {a.name}
                </Link>
              </span>
            ))}
            <span className="text-faint">›</span>
            <span className="font-semibold text-text">{location.name}</span>
          </div>
        )}

        {location.notes && (
          <div className="bg-white border border-border rounded-[18px] shadow-card-sm px-4 py-3 text-xs text-muted">
            {location.notes}
          </div>
        )}

        <LinkButton href={`/inventory/warehouse/${location.id}/label`} variant="secondary" size="sm">
          Print Barcode Label
        </LinkButton>

        <CreateStorageLocationForm
          parentOptions={parentOptions}
          fixedParentId={location.id}
          fixedParentLabel={location.name}
        />

        {children.length > 0 && (
          <div>
            <SectionLabel className="mb-2.5">Sub-locations ({children.length})</SectionLabel>
            <div className="flex flex-col gap-2">
              {children.map((c) => {
                const itemCount = tree.totalItems(c.id);
                const subCount = tree.subLocationCount(c.id);
                return (
                  <div key={c.id} className="bg-white border border-border rounded-2xl shadow-card-sm px-3.5 py-3 flex items-center gap-3">
                    <Link href={`/inventory/warehouse/${c.id}`} className="flex-1 min-w-0 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-[10px] bg-primary-soft flex items-center justify-center shrink-0">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2B8DB8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-text truncate">{c.name}</span>
                          {!c.active && <span className="text-[10px] font-semibold text-danger shrink-0">(inactive)</span>}
                        </div>
                        <div className="text-xs text-muted mt-0.5">
                          {subCount > 0 && `${subCount} sub-location${subCount === 1 ? "" : "s"} · `}
                          {itemCount} item{itemCount === 1 ? "" : "s"}
                        </div>
                      </div>
                    </Link>
                    <form action={setStorageLocationActiveAction.bind(null, c.id, !c.active)} className="shrink-0">
                      <button
                        type="submit"
                        className={`text-[11px] font-semibold cursor-pointer ${c.active ? "text-danger" : "text-success-dark"}`}
                      >
                        {c.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </form>
                    <Link href={`/inventory/warehouse/${c.id}`} className="shrink-0" aria-label={`View ${c.name}`}>
                      <Chevron />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <SectionLabel className="mb-2.5">Reagents &amp; Chemicals ({location.reagents.length})</SectionLabel>
          <div className="flex flex-col gap-2">
            {location.reagents.map((r) => (
              <Link
                key={r.id}
                href={`/inventory/reagents/${r.id}`}
                className="bg-white border border-border rounded-2xl shadow-card-sm px-3.5 py-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text truncate">{r.name}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {r.quantity} {r.unit} · Lot {r.lotNumber}
                    {r.expiryDate && ` · exp ${formatDate(r.expiryDate)}`}
                  </div>
                </div>
                <Chevron />
              </Link>
            ))}
            {location.reagents.length === 0 && <EmptyState>No reagents stored here.</EmptyState>}
          </div>
        </div>

        <div>
          <SectionLabel className="mb-2.5">Equipment ({location.equipment.length})</SectionLabel>
          <div className="flex flex-col gap-2">
            {location.equipment.map((e) => (
              <Link
                key={e.id}
                href={`/inventory/equipment/${e.id}`}
                className="bg-white border border-border rounded-2xl shadow-card-sm px-3.5 py-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text truncate">{e.name}</div>
                  <div className="text-xs text-muted mt-0.5 font-mono-data">{e.assetTag} · {e.status}</div>
                </div>
                <Chevron />
              </Link>
            ))}
            {location.equipment.length === 0 && <EmptyState>No equipment stored here.</EmptyState>}
          </div>
        </div>
      </div>
    </div>
  );
}
