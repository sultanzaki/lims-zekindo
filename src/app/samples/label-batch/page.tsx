import QRCode from "qrcode";
import { requirePageUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import BackHeader from "@/components/BackHeader";
import PrintButton from "@/components/PrintButton";
import LabelCard from "@/components/LabelCard";
import EmptyState from "@/components/ui/EmptyState";

export default async function SampleLabelBatchPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  await requirePageUser();
  const { ids } = await searchParams;
  const sampleIds = (ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const samples = sampleIds.length
    ? await prisma.sample.findMany({
        where: { id: { in: sampleIds } },
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
      })
    : [];

  // Preserve the order the user selected them in, not whatever order the
  // database happens to return.
  const ordered = sampleIds.map((id) => samples.find((s) => s.id === id)).filter((s): s is NonNullable<typeof s> => Boolean(s));

  const printedAt = formatDateTime(new Date());
  const cards = await Promise.all(
    ordered.map(async (sample) => ({
      sample,
      qrDataUrl: await QRCode.toDataURL(`/samples/${sample.id}`, { margin: 1, width: 240 }),
    }))
  );

  return (
    <div className="min-h-screen print:min-h-0 flex flex-col bg-white">
      <div className="no-print">
        <BackHeader title={`Batch Labels (${cards.length})`} backHref="/samples" />
      </div>

      <div className="label-print-wrap flex-1 px-5 pt-6 pb-7 flex flex-col items-center gap-4">
        {cards.length === 0 && (
          <div className="no-print w-full max-w-[320px]">
            <EmptyState>No samples selected. Go back and pick some from the Samples list.</EmptyState>
          </div>
        )}

        {cards.map(({ sample, qrDataUrl }) => (
          <div key={sample.id} className="label-batch-item w-full flex justify-center">
            <LabelCard
              qrDataUrl={qrDataUrl}
              docType="Sample Label"
              code={sample.id}
              title={sample.name}
              fields={[
                { label: "Type", value: sample.type },
                { label: "Priority", value: sample.priority },
                { label: "Container", value: sample.container },
                { label: "Source", value: sample.source },
                { label: "Collected", value: formatDateTime(sample.collectedDate) },
                { label: "Received", value: formatDateTime(sample.receivedDate) },
                { label: "Location", value: sample.storageLocation },
              ]}
              printedAt={printedAt}
            />
          </div>
        ))}

        {cards.length > 0 && (
          <div className="no-print w-full max-w-[280px]">
            <PrintButton label={`Print ${cards.length} Labels`} />
          </div>
        )}
      </div>
    </div>
  );
}
