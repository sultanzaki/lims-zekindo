import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requirePageRole } from "@/lib/auth";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { pathForLocationId } from "@/lib/warehouse";
import { formatDate, formatDateTime } from "@/lib/format";
import BackHeader from "@/components/BackHeader";
import PrintButton from "@/components/PrintButton";
import LabelCard from "@/components/LabelCard";

export default async function EquipmentLabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageRole(canManageInventoryAndCatalog);
  const { id } = await params;
  const equipment = await prisma.equipment.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      assetTag: true,
      status: true,
      location: true,
      storageLocation: true,
      lastCalibratedAt: true,
      nextCalibrationDue: true,
    },
  });
  if (!equipment) notFound();

  const locationName = equipment.storageLocation ? await pathForLocationId(equipment.storageLocation.id) : equipment.location;
  const qrDataUrl = await QRCode.toDataURL(`/inventory/equipment/${equipment.id}`, { margin: 1, width: 240 });

  return (
    <div className="min-h-screen print:min-h-0 flex flex-col bg-white">
      <div className="no-print">
        <BackHeader title="Equipment Label" backHref={`/inventory/equipment/${equipment.id}`} />
      </div>

      <div className="label-print-wrap flex-1 px-5 pt-6 pb-7 flex flex-col items-center gap-4">
        <LabelCard
          qrDataUrl={qrDataUrl}
          docType="Equipment Label"
          code={equipment.assetTag}
          title={equipment.name}
          fields={[
            { label: "Status", value: equipment.status },
            { label: "Location", value: locationName },
            { label: "Last Calibrated", value: equipment.lastCalibratedAt ? formatDate(equipment.lastCalibratedAt) : null },
            { label: "Next Cal. Due", value: equipment.nextCalibrationDue ? formatDate(equipment.nextCalibrationDue) : null },
          ]}
          printedAt={formatDateTime(new Date())}
        />
        <div className="no-print w-full max-w-[280px]">
          <PrintButton label="Print Label" />
        </div>
      </div>
    </div>
  );
}
