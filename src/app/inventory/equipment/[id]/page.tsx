import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { signedAttachmentUrl } from "@/lib/storage";
import { pathForLocationId } from "@/lib/warehouse";
import BackHeader from "@/components/BackHeader";
import LinkButton from "@/components/ui/LinkButton";
import SectionLabel from "@/components/ui/SectionLabel";
import EmptyState from "@/components/ui/EmptyState";
import { ChangeStatusForm, LogCalibrationForm, LogMaintenanceForm } from "@/components/EquipmentDetailForms";
import NfcTagPanel from "@/components/NfcTagPanel";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Operational: { bg: "#E6F4EA", color: "#1E7A34" },
  "Under Maintenance": { bg: "#FEF3E0", color: "#9A6100" },
  "Out of Service": { bg: "#FDECEA", color: "#B00016" },
};

const EVENT_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  CALIBRATION: { label: "Calibration", bg: "#E8F4FA", color: "#1A5F7A" },
  MAINTENANCE: { label: "Maintenance", bg: "#FEF3E0", color: "#9A6100" },
  STATUS_CHANGE: { label: "Status change", bg: "#EEF2F5", color: "#5B6B74" },
};

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageRole(canManageInventoryAndCatalog);
  const { id } = await params;

  const [equipment, activeNfcTag] = await Promise.all([
    prisma.equipment.findUnique({
      where: { id },
      include: { storageLocation: true, events: { orderBy: { performedAt: "desc" } } },
    }),
    prisma.nfcTag.findFirst({
      where: { entityType: "EQUIPMENT", entityId: id, active: true },
      select: { registeredBy: true, registeredAt: true },
    }),
  ]);
  if (!equipment) notFound();

  const events = await Promise.all(
    equipment.events.map(async (e) => ({
      ...e,
      attachmentUrl: e.attachmentStoragePath ? await signedAttachmentUrl(e.attachmentStoragePath) : null,
    }))
  );

  const style = STATUS_STYLE[equipment.status] ?? STATUS_STYLE.Operational;
  const overdue = equipment.nextCalibrationDue && equipment.nextCalibrationDue.getTime() < new Date().getTime();
  const locationName = equipment.storageLocation
    ? await pathForLocationId(equipment.storageLocation.id)
    : equipment.location;

  return (
    <div className="min-h-screen flex flex-col bg-page-bg">
      <BackHeader title={equipment.name} backHref="/inventory/equipment" />
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-4">
        <div className="bg-white border border-border rounded-[18px] shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border-soft">
            <span className="text-xs font-semibold text-muted font-mono-data">{equipment.assetTag}</span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: style.bg, color: style.color }}>
              {equipment.status}
            </span>
          </div>
          <InfoRow label="Location" value={locationName || "Not set"} />
          <InfoRow label="Last calibrated" value={equipment.lastCalibratedAt ? formatDate(equipment.lastCalibratedAt) : "Never"} />
          <InfoRow
            label="Next calibration due"
            value={equipment.nextCalibrationDue ? `${formatDate(equipment.nextCalibrationDue)}${overdue ? " (overdue)" : ""}` : "Not set"}
            valueColor={overdue ? "#D0021B" : undefined}
            last
          />
        </div>

        <LinkButton href={`/inventory/equipment/${equipment.id}/label`} variant="secondary" size="sm">
          Print Barcode Label
        </LinkButton>

        <NfcTagPanel entityType="EQUIPMENT" entityId={equipment.id} activeTag={activeNfcTag} />

        <ChangeStatusForm id={equipment.id} currentStatus={equipment.status} />
        <LogCalibrationForm id={equipment.id} />
        <LogMaintenanceForm id={equipment.id} />

        <div>
          <SectionLabel className="mb-2.5">History ({events.length})</SectionLabel>
          <div className="flex flex-col gap-2">
            {events.map((e) => {
              const es = EVENT_STYLE[e.type] ?? { label: e.type, bg: "#EEF2F5", color: "#5B6B74" };
              return (
                <div key={e.id} className="bg-white border border-border rounded-2xl shadow-card-sm p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: es.bg, color: es.color }}>
                      {es.label}
                    </span>
                    <span className="text-[11px] text-faint">{formatDateTime(e.performedAt)}</span>
                  </div>
                  {e.detail && <div className="text-xs text-text mt-1.5">{e.detail}</div>}
                  <div className="text-[11px] text-muted mt-1">
                    {e.performedBy}
                    {e.nextDueAt && ` · next due ${formatDate(e.nextDueAt)}`}
                  </div>
                  {e.attachmentUrl && e.attachmentFileName && (
                    <a href={e.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-primary mt-1.5 inline-block">
                      📎 {e.attachmentFileName}
                    </a>
                  )}
                </div>
              );
            })}
            {events.length === 0 && <EmptyState>No calibration or maintenance history yet.</EmptyState>}
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
