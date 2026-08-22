import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import BackHeader from "@/components/BackHeader";
import PrintButton from "@/components/PrintButton";

export default async function SampleLabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sample = await prisma.sample.findUnique({
    where: { id },
    select: { id: true, type: true, source: true, collectedDate: true, storageLocation: true },
  });
  if (!sample) notFound();

  const qrDataUrl = await QRCode.toDataURL(sample.id, { margin: 1, width: 240 });

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="no-print">
        <BackHeader title="Barcode Label" backHref={`/samples/${sample.id}`} />
      </div>

      <div className="flex-1 px-5 pt-6 pb-7 flex flex-col items-center gap-4">
        <div className="w-full max-w-[280px] border-2 border-text rounded-xl p-4 flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt={`QR code for ${sample.id}`} width={180} height={180} />
          <div className="text-lg font-bold text-text tracking-wide">{sample.id}</div>
          <div className="text-xs text-muted">{sample.type}</div>
          <div className="text-[11px] text-muted">{sample.source}</div>
          {sample.storageLocation && <div className="text-[11px] text-muted">{sample.storageLocation}</div>}
        </div>

        <div className="no-print w-full max-w-[280px]">
          <PrintButton label="Print Label" />
        </div>
      </div>
    </div>
  );
}
