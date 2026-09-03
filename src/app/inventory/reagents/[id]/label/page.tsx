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
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reagent Label" };

export default async function ReagentLabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageRole(canManageInventoryAndCatalog);
  const { id } = await params;
  const reagent = await prisma.reagent.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      lotNumber: true,
      category: true,
      quantity: true,
      unit: true,
      expiryDate: true,
      location: true,
      storageLocation: true,
    },
  });
  if (!reagent) notFound();

  const locationName = reagent.storageLocation ? await pathForLocationId(reagent.storageLocation.id) : reagent.location;
  const qrDataUrl = await QRCode.toDataURL(`/inventory/reagents/${reagent.id}`, { margin: 1, width: 240 });

  return (
    <div className="min-h-screen print:min-h-0 flex flex-col bg-white">
      <div className="no-print">
        <BackHeader title="Reagent Label" backHref={`/inventory/reagents/${reagent.id}`} />
      </div>

      <div className="label-print-wrap flex-1 px-5 pt-6 pb-7 flex flex-col items-center gap-4">
        <LabelCard
          qrDataUrl={qrDataUrl}
          docType="Reagent Label"
          code={`LOT ${reagent.lotNumber}`}
          title={reagent.name}
          fields={[
            { label: "Category", value: reagent.category },
            { label: "Quantity", value: `${reagent.quantity} ${reagent.unit}` },
            { label: "Expiry", value: reagent.expiryDate ? formatDate(reagent.expiryDate) : null },
            { label: "Location", value: locationName },
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
