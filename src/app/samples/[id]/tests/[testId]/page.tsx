import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import BackHeader from "@/components/BackHeader";
import TestResultForm from "@/components/TestResultForm";

export default async function TestEntryPage({
  params,
}: {
  params: Promise<{ id: string; testId: string }>;
}) {
  const { id, testId } = await params;
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test || test.sampleId !== id) notFound();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <BackHeader title="Enter Result" backHref={`/samples/${id}`} />
      <div className="px-5 pt-4.5">
        <div className="bg-surface border border-border-soft rounded-xl p-3.5">
          <div className="text-[11px] font-semibold text-muted tracking-wider uppercase mb-1.5">{id}</div>
          <div className="text-[15px] font-semibold text-text">{test.name}</div>
          <div className="text-xs text-muted mt-1">Spec: {test.spec}</div>
        </div>
      </div>
      <TestResultForm sampleId={id} testId={test.id} unit={test.unit} />
    </div>
  );
}
