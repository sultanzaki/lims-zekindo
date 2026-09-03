import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { pathForLocationId } from "@/lib/warehouse";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import LinkButton from "@/components/ui/LinkButton";
import SectionLabel from "@/components/ui/SectionLabel";
import EmptyState from "@/components/ui/EmptyState";
import { ReagentTransactionForm } from "@/components/ReagentDetailForms";
import NfcTagPanel from "@/components/NfcTagPanel";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const reagent = await prisma.reagent.findUnique({ where: { id }, select: { name: true } });
  return { title: reagent?.name ?? "Reagent" };
}

const TX_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  RECEIVED: { label: "Received", bg: "#E6F4EA", color: "#1E7A34" },
  CONSUMED: { label: "Consumed", bg: "#EEF2F5", color: "#5B6B74" },
  ADJUSTED: { label: "Adjusted", bg: "#E8F4FA", color: "#1A5F7A" },
  DISPOSED: { label: "Disposed", bg: "#FDECEA", color: "#B00016" },
};

export default async function ReagentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageRole(canManageInventoryAndCatalog);
  const { id } = await params;

  const [reagent, activeNfcTag, unread] = await Promise.all([
    prisma.reagent.findUnique({
      where: { id },
      include: { storageLocation: true, transactions: { orderBy: { performedAt: "desc" } } },
    }),
    prisma.nfcTag.findFirst({
      where: { entityType: "REAGENT", entityId: id, active: true },
      select: { registeredBy: true, registeredAt: true },
    }),
    getUnreadCount(user.id),
  ]);
  if (!reagent) notFound();

  const now = new Date().getTime();
  const lowStock = reagent.quantity <= reagent.minStockLevel;
  const expired = reagent.expiryDate && reagent.expiryDate.getTime() < now;
  const locationName = reagent.storageLocation
    ? await pathForLocationId(reagent.storageLocation.id)
    : reagent.location;

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title={reagent.name} backHref="/inventory/reagents" />
      <div className="flex-1 px-5 md:px-8 pt-4.5 pb-7 flex flex-col gap-4 md:max-w-[720px] md:w-full">
        <div className="bg-white border border-border rounded-[18px] shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border-soft">
            <span className="text-xs font-semibold text-muted font-mono-data">Lot {reagent.lotNumber}</span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-chip-bg text-muted">{reagent.category}</span>
          </div>
          <InfoRow label="Current quantity" value={`${reagent.quantity} ${reagent.unit}`} valueColor={lowStock ? "#D0021B" : undefined} />
          <InfoRow label="Min stock level" value={`${reagent.minStockLevel} ${reagent.unit}`} />
          <InfoRow label="Location" value={locationName || "Not set"} />
          <InfoRow
            label="Expiry date"
            value={reagent.expiryDate ? `${formatDate(reagent.expiryDate)}${expired ? " (expired)" : ""}` : "Not set"}
            valueColor={expired ? "#D0021B" : undefined}
            last
          />
        </div>

        <LinkButton href={`/inventory/reagents/${reagent.id}/label`} variant="secondary" size="sm">
          Print Barcode Label
        </LinkButton>

        <NfcTagPanel entityType="REAGENT" entityId={reagent.id} activeTag={activeNfcTag} />

        <ReagentTransactionForm id={reagent.id} quantity={reagent.quantity} unit={reagent.unit} />

        <div>
          <SectionLabel className="mb-2.5">Stock History ({reagent.transactions.length})</SectionLabel>
          <div className="flex flex-col gap-2">
            {reagent.transactions.map((t) => {
              const style = TX_STYLE[t.type] ?? { label: t.type, bg: "#EEF2F5", color: "#5B6B74" };
              return (
                <div key={t.id} className="bg-white border border-border rounded-2xl shadow-card-sm p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: style.bg, color: style.color }}>
                      {style.label}
                    </span>
                    <span
                      className="text-sm font-bold font-mono-data"
                      style={{ color: t.quantityChange >= 0 ? "#1E7A34" : "#B00016" }}
                    >
                      {t.quantityChange >= 0 ? "+" : ""}
                      {t.quantityChange} {reagent.unit}
                    </span>
                  </div>
                  {t.reason && <div className="text-xs text-text mt-1.5">{t.reason}</div>}
                  <div className="text-[11px] text-muted mt-1">
                    {t.performedBy} · {formatDateTime(t.performedAt)} · balance {t.quantityAfter} {reagent.unit}
                  </div>
                </div>
              );
            })}
            {reagent.transactions.length === 0 && <EmptyState>No stock movements recorded yet.</EmptyState>}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, valueColor, last }: { label: string; value: string; valueColor?: string; last?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3.5 px-4 py-3 ${last ? "" : "border-b border-border-soft"}`}>
      <span className="text-[13px] text-muted shrink-0">{label}</span>
      <span className="text-[13px] font-semibold text-right leading-snug" style={{ color: valueColor ?? "var(--color-text)" }}>
        {value}
      </span>
    </div>
  );
}
