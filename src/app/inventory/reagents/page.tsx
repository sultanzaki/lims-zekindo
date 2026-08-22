import { requirePageRole } from "@/lib/auth";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import BackHeader from "@/components/BackHeader";
import { CreateReagentForm, UpdateQuantityForm } from "@/components/InventoryForms";
import EmptyState from "@/components/ui/EmptyState";

export default async function ReagentsPage() {
  await requirePageRole(canManageInventoryAndCatalog);
  const reagents = await prisma.reagent.findMany({ orderBy: { name: "asc" } });
  const now = new Date().getTime();
  const soonMs = 14 * 24 * 60 * 60 * 1000;

  return (
    <div className="h-dvh flex flex-col overflow-y-auto overscroll-contain bg-page-bg">
      <BackHeader title="Reagents" backHref="/profile" />
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-4">
        <CreateReagentForm />

        <div className="flex flex-col gap-2">
          {reagents.map((r) => {
            const lowStock = r.quantity <= r.minStockLevel;
            const expiringSoon = r.expiryDate && r.expiryDate.getTime() - now < soonMs;
            const expired = r.expiryDate && r.expiryDate.getTime() < now;
            return (
              <div key={r.id} className="bg-white border border-border rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-[13px] font-semibold text-text">{r.name}</div>
                  <div className="flex gap-1.5">
                    {lowStock && <Badge color="#C22233" label="Low stock" />}
                    {expired && <Badge color="#C22233" label="Expired" />}
                    {!expired && expiringSoon && <Badge color="#B3720C" label="Expiring soon" />}
                  </div>
                </div>
                <div className="text-[11px] text-muted mb-1.5">
                  Lot {r.lotNumber} {r.location && `· ${r.location}`}
                  {r.expiryDate && ` · Expires ${formatDateTime(r.expiryDate)}`}
                </div>
                <UpdateQuantityForm id={r.id} quantity={r.quantity} unit={r.unit} />
              </div>
            );
          })}
          {reagents.length === 0 && <EmptyState>No reagents tracked yet.</EmptyState>}
        </div>
      </div>
    </div>
  );
}

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[6px]" style={{ background: "#EFF2F5", color }}>
      {label}
    </span>
  );
}
