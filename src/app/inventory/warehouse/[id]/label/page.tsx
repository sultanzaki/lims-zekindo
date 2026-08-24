import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requirePageRole } from "@/lib/auth";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { pathForLocationId } from "@/lib/warehouse";
import { formatDateTime } from "@/lib/format";
import BackHeader from "@/components/BackHeader";
import PrintButton from "@/components/PrintButton";
import LabelCard from "@/components/LabelCard";

export default async function StorageLocationLabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageRole(canManageInventoryAndCatalog);
  const { id } = await params;
  const location = await prisma.storageLocation.findUnique({
    where: { id },
    select: { id: true, name: true, notes: true, _count: { select: { reagents: true, equipment: true } } },
  });
  if (!location) notFound();

  const path = await pathForLocationId(location.id);
  const qrDataUrl = await QRCode.toDataURL(`/inventory/warehouse/${location.id}`, { margin: 1, width: 240 });

  return (
    <div className="min-h-screen print:min-h-0 flex flex-col bg-white">
      <div className="no-print">
        <BackHeader title="Location Label" backHref={`/inventory/warehouse/${location.id}`} />
      </div>

      <div className="label-print-wrap flex-1 px-5 pt-6 pb-7 flex flex-col items-center gap-4">
        <LabelCard
          qrDataUrl={qrDataUrl}
          docType="Location Label"
          code={location.name}
          fields={[
            { label: "Full Path", value: path !== location.name ? path : null },
            { label: "Reagents Stored", value: String(location._count.reagents) },
            { label: "Equipment Stored", value: String(location._count.equipment) },
            { label: "Notes", value: location.notes },
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
