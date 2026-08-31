import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import BackHeader from "@/components/BackHeader";
import PrintButton from "@/components/PrintButton";
import LabelCard, { type LabelSize } from "@/components/LabelCard";
import LabelSizeSwitch from "@/components/LabelSizeSwitch";

function parseSize(value: string | undefined): LabelSize {
  return value === "small" || value === "medium" ? value : "large";
}

export default async function SampleLabelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ size?: string }>;
}) {
  const { id } = await params;
  const { size: sizeParam } = await searchParams;
  const size = parseSize(sizeParam);
  const sample = await prisma.sample.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      type: true,
      source: true,
      container: true,
      priority: true,
      collectedDate: true,
      receivedDate: true,
      storageLocation: true,
    },
  });
  if (!sample) notFound();

  const qrDataUrl = await QRCode.toDataURL(`/samples/${sample.id}`, { margin: 1, width: 240 });

  return (
    <div className="min-h-screen print:min-h-0 flex flex-col bg-white">
      <div className="no-print">
        <BackHeader title="Barcode Label" backHref={`/samples/${sample.id}`} />
      </div>

      <div className="label-print-wrap flex-1 px-5 pt-6 pb-7 flex flex-col items-center gap-4">
        <LabelSizeSwitch basePath={`/samples/${sample.id}/label`} size={size} />

        <LabelCard
          qrDataUrl={qrDataUrl}
          docType="Sample Label"
          code={sample.id}
          title={sample.name}
          size={size}
          fields={[
            { label: "Type", value: sample.type },
            { label: "Priority", value: sample.priority },
            { label: "Container", value: sample.container },
            { label: "Source", value: sample.source },
            { label: "Collected", value: formatDateTime(sample.collectedDate) },
            { label: "Received", value: formatDateTime(sample.receivedDate) },
            { label: "Location", value: sample.storageLocation },
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
