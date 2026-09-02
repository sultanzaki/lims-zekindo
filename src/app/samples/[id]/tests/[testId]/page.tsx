import { notFound, redirect } from "next/navigation";
import { requirePageUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { prisma } from "@/lib/db";
import { signedAttachmentUrl } from "@/lib/storage";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import TestResultForm from "@/components/TestResultForm";
import TestReadingsPanel from "@/components/TestReadingsPanel";
import TestAttachmentsPanel from "@/components/TestAttachmentsPanel";

export default async function TestEntryPage({
  params,
}: {
  params: Promise<{ id: string; testId: string }>;
}) {
  const { id, testId } = await params;
  const user = await requirePageUser();
  const [test, unread] = await Promise.all([
    prisma.test.findUnique({
      where: { id: testId },
      include: {
        readings: { orderBy: { takenAt: "asc" } },
        attachments: { orderBy: { uploadedAt: "desc" } },
      },
    }),
    getUnreadCount(user.id),
  ]);
  if (!test || test.sampleId !== id) notFound();
  if (test.status !== "pending") redirect(`/samples/${id}`);

  const isMulti = test.resultMode === "MULTI";
  const attachments = await Promise.all(
    test.attachments.map(async (a) => ({ ...a, url: await signedAttachmentUrl(a.storagePath) }))
  );

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Enter Result" backHref={`/samples/${id}`} />
      <div className="px-5 md:px-8 pt-4.5 flex flex-col gap-3.5 md:max-w-[640px] md:w-full">
        <div className="bg-white border border-border rounded-[18px] shadow-card px-4 py-3.5">
          <div className="text-[15px] font-semibold text-text leading-snug">{test.name}</div>
          <div className="flex items-center justify-between gap-3 mt-2.5 pt-2.5 border-t border-border-soft">
            <div>
              <div className="text-[11px] text-faint tracking-wide uppercase font-semibold">Unit</div>
              <div className="text-[13px] text-[#444] font-medium mt-0.5">{test.unit || "—"}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-faint tracking-wide uppercase font-semibold">Spec</div>
              <div className="text-[13px] text-[#444] font-semibold font-mono-data mt-0.5">{test.spec}</div>
            </div>
          </div>
          {isMulti && (
            <div className="text-[11px] text-muted mt-2 pt-2 border-t border-border-soft">
              {[test.replicateCount ? `${test.replicateCount} replicates` : null, test.intervalPlan ? `checkpoints: ${test.intervalPlan}` : null]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
        </div>

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

        <TestAttachmentsPanel sampleId={id} testId={test.id} attachments={attachments} />
      </div>

      <div className="mx-5 mt-3.5 border-t border-border-soft" />
      <TestResultForm sampleId={id} testId={test.id} unit={test.unit} spec={test.spec} isMulti={isMulti} resultConfig={test} />
    </div>
  );
}
