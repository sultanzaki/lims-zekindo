import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getSampleDetail } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { canReviewAsSupervisor, canApproveAsQa, isAdmin } from "@/lib/roles";
import { signedAttachmentUrl } from "@/lib/storage";
import { formatAccessCode } from "@/lib/tracking";
import SampleDetailClient from "@/components/SampleDetailClient";
import {
  supervisorApproveAction,
  supervisorRejectAction,
  qaApproveAction,
  qaRejectAction,
  retestSampleAction,
  markDisposedAction,
  uploadSampleReportAction,
  deleteSampleReportAction,
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

  // Photos are visible to anyone (carousel), but non-image working docs
  // (Excel/CSV etc.) are Supervisor/QA-only per the lab's documentation
  // access rule — so only mint a signed URL for those when the viewer is
  // actually allowed to download them, instead of relying on the client
  // to just hide a link that's already sitting in the page payload.
  const canDownloadDocs = canReviewAsSupervisor(user.accessRole) || canApproveAsQa(user.accessRole);

  const sampleWithAttachmentUrls = {
    ...sample,
    tests: await Promise.all(
      sample.tests.map(async (test) => ({
        ...test,
        attachments: await Promise.all(
          test.attachments.map(async (a) => ({
            ...a,
            url: a.fileType.startsWith("image/") || canDownloadDocs ? await signedAttachmentUrl(a.storagePath) : null,
          }))
        ),
      }))
    ),
    reports: await Promise.all(
      sample.reports.map(async (r) => ({ ...r, url: await signedAttachmentUrl(r.storagePath) }))
    ),
  };

  let trackingUrl: string | null = null;
  if (sample.accessCode) {
    const h = await headers();
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
    trackingUrl = host ? `${proto}://${host}/track?id=${sample.id}&code=${sample.accessCode}` : null;
  }

  return (
    <SampleDetailClient
      sample={sampleWithAttachmentUrls}
      targetHours={targetHours}
      dueAt={dueAt}
      isOverdue={isOverdue}
      trackingUrl={trackingUrl}
      accessCodeFormatted={sample.accessCode ? formatAccessCode(sample.accessCode) : null}
      actions={{
        canReviewAsSupervisor: canReviewAsSupervisor(user.accessRole),
        canApproveAsQa: canApproveAsQa(user.accessRole),
        canManageReports: canReviewAsSupervisor(user.accessRole) || canApproveAsQa(user.accessRole) || isAdmin(user.accessRole),
        supervisorApproveAction: supervisorApproveAction.bind(null, sample.id),
        supervisorRejectAction: supervisorRejectAction.bind(null, sample.id),
        qaApproveAction: qaApproveAction.bind(null, sample.id),
        qaRejectAction: qaRejectAction.bind(null, sample.id),
        retestSampleAction: retestSampleAction.bind(null, sample.id),
        markDisposedAction: markDisposedAction.bind(null, sample.id),
        uploadSampleReportAction: uploadSampleReportAction.bind(null, sample.id),
        deleteSampleReportAction: deleteSampleReportAction.bind(null, sample.id),
      }}
    />
  );
}
