import { getCurrentUser } from "@/lib/auth";
import { getNextSampleId } from "@/lib/data";
import BackHeader from "@/components/BackHeader";
import NewSampleForm from "@/components/NewSampleForm";

export default async function NewSamplePage() {
  const [user, nextSampleId] = await Promise.all([getCurrentUser(), getNextSampleId()]);
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <BackHeader title="New Sample" backHref="/dashboard" />
      <NewSampleForm nextSampleId={nextSampleId} defaultCollectedBy={user.name} />
    </div>
  );
}
