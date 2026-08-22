import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import BackHeader from "@/components/BackHeader";
import TestResultForm from "@/components/TestResultForm";
import TestReadingsPanel from "@/components/TestReadingsPanel";
import Card from "@/components/ui/Card";
import SectionLabel from "@/components/ui/SectionLabel";

export default async function TestEntryPage({
  params,
}: {
  params: Promise<{ id: string; testId: string }>;
}) {
  const { id, testId } = await params;
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: { readings: { orderBy: { takenAt: "asc" } } },
  });
  if (!test || test.sampleId !== id) notFound();
  if (test.status !== "pending") redirect(`/samples/${id}`);

  const isMulti = test.resultMode === "MULTI";

  return (
    <div className="h-dvh flex flex-col overflow-y-auto overscroll-contain bg-white">
      <BackHeader title="Enter Result" backHref={`/samples/${id}`} />
      <div className="px-5 pt-4.5 flex flex-col gap-4">
        <Card className="bg-surface">
          <SectionLabel className="mb-1.5">{id}</SectionLabel>
          <div className="text-[15px] font-semibold text-text">{test.name}</div>
          <div className="text-xs text-muted mt-1">Spec: {test.spec}</div>
          {isMulti && (
            <div className="text-[11px] text-muted mt-1">
              {[test.replicateCount ? `${test.replicateCount} replicates` : null, test.intervalPlan ? `checkpoints: ${test.intervalPlan}` : null]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
        </Card>

        {isMulti && (
          <TestReadingsPanel
            sampleId={id}
            testId={test.id}
            unit={test.unit}
            intervalPlan={test.intervalPlan}
            replicateCount={test.replicateCount}
            readings={test.readings}
          />
        )}
      </div>

      {isMulti && <div className="mx-5 mt-4 border-t border-border-soft" />}
      <TestResultForm sampleId={id} testId={test.id} unit={test.unit} isMulti={isMulti} />
    </div>
  );
}
