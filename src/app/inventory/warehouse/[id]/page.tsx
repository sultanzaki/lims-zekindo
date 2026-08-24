import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import BackHeader from "@/components/BackHeader";
import SectionLabel from "@/components/ui/SectionLabel";
import EmptyState from "@/components/ui/EmptyState";
import Chevron from "@/components/ui/Chevron";

export default async function StorageLocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageRole(canManageInventoryAndCatalog);
  const { id } = await params;

  const location = await prisma.storageLocation.findUnique({
    where: { id },
    include: {
      reagents: { orderBy: { name: "asc" } },
      equipment: { orderBy: { name: "asc" } },
    },
  });
  if (!location) notFound();

  return (
    <div className="min-h-screen flex flex-col bg-page-bg">
      <BackHeader title={location.name} backHref="/inventory/warehouse" />
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-4">
        {location.notes && (
          <div className="bg-white border border-border rounded-[18px] shadow-card-sm px-4 py-3 text-xs text-muted">
            {location.notes}
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
