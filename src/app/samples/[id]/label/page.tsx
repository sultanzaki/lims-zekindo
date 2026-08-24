import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import BackHeader from "@/components/BackHeader";
import PrintButton from "@/components/PrintButton";
import LabelCard from "@/components/LabelCard";

export default async function SampleLabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sample = await prisma.sample.findUnique({
    where: { id },
    select: { id: true, name: true, type: true, source: true, collectedDate: true, storageLocation: true },
  });
  if (!sample) notFound();

  const qrDataUrl = await QRCode.toDataURL(`/samples/${sample.id}`, { margin: 1, width: 240 });

  return (
    <div className="min-h-screen print:min-h-0 flex flex-col bg-white">
      <div className="no-print">
        <BackHeader title="Barcode Label" backHref={`/samples/${sample.id}`} />
      </div>

      <div className="label-print-wrap flex-1 px-5 pt-6 pb-7 flex flex-col items-center gap-4">
        <LabelCard
          qrDataUrl={qrDataUrl}
          code={sample.id}
          title={sample.name}
          lines={[sample.type, sample.source, sample.storageLocation]}
        />

        <div className="no-print w-full max-w-[280px]">
          <PrintButton label="Print Label" />
        </div>
      </div>
    </div>
  );
}
