import { notFound } from "next/navigation";
import { getSampleDetail } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { canReviewAsSupervisor, canApproveAsQa } from "@/lib/roles";
import { signedAttachmentUrl } from "@/lib/storage";
import SampleDetailClient from "@/components/SampleDetailClient";
import {
  supervisorApproveAction,
  supervisorRejectAction,
  qaApproveAction,
  qaRejectAction,
  retestSampleAction,
  markDisposedAction,
} from "@/lib/actions/samples";

export default async function SampleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [sample, user] = await Promise.all([getSampleDetail(id), getCurrentUser()]);
  if (!sample || !user) notFound();

  const targetHours = sample.sampleType?.targetTatHours ?? 48;
  const dueAt = new Date(sample.receivedDate.getTime() + targetHours * 60 * 60 * 1000);
  const isOpenStatus = !["Complete", "Rejected"].includes(sample.status);
  const isOverdue = isOpenStatus && dueAt.getTime() < new Date().getTime();

  const sampleWithAttachmentUrls = {
    ...sample,
    tests: await Promise.all(
      sample.tests.map(async (test) => ({
        ...test,
        attachments: await Promise.all(
          test.attachments.map(async (a) => ({ ...a, url: await signedAttachmentUrl(a.storagePath) }))
        ),
      }))
    ),
  };

  return (
    <SampleDetailClient
      sample={sampleWithAttachmentUrls}
      targetHours={targetHours}
      dueAt={dueAt}
      isOverdue={isOverdue}
      actions={{
        canReviewAsSupervisor: canReviewAsSupervisor(user.accessRole),
        canApproveAsQa: canApproveAsQa(user.accessRole),
        supervisorApproveAction: supervisorApproveAction.bind(null, sample.id),
        supervisorRejectAction: supervisorRejectAction.bind(null, sample.id),
        qaApproveAction: qaApproveAction.bind(null, sample.id),
        qaRejectAction: qaRejectAction.bind(null, sample.id),
        retestSampleAction: retestSampleAction.bind(null, sample.id),
        markDisposedAction: markDisposedAction.bind(null, sample.id),
      }}
    />
  );
}
