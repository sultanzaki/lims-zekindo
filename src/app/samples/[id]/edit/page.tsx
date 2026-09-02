import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { dateAsJakartaLocalInput } from "@/lib/tz";
import { updateSampleAction } from "@/lib/actions/samples";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import EditSampleForm from "@/components/EditSampleForm";

const EDITABLE_STATUSES = new Set(["Pending Login", "In Testing"]);

export default async function EditSamplePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [sample, unread] = await Promise.all([
    prisma.sample.findUnique({
      where: { id },
      select: { id: true, name: true, requestorName: true, source: true, collectedDate: true, status: true },
    }),
    getUnreadCount(user.id),
  ]);
  if (!sample) notFound();
  if (!EDITABLE_STATUSES.has(sample.status)) redirect(`/samples/${sample.id}`);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Edit Sample" backHref={`/samples/${sample.id}`} />
      <EditSampleForm
        action={updateSampleAction.bind(null, sample.id)}
        defaultName={sample.name ?? ""}
        defaultRequestorName={sample.requestorName ?? ""}
        defaultSource={sample.source}
        defaultCollectedDate={dateAsJakartaLocalInput(sample.collectedDate)}
      />
    </div>
  );
}
