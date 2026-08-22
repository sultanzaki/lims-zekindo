import { getCurrentUser } from "@/lib/auth";
import { getNextSampleId } from "@/lib/data";
import BackHeader from "@/components/BackHeader";
import NewSampleForm from "@/components/NewSampleForm";

export default async function NewSamplePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const nextSampleId = await getNextSampleId();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <BackHeader title="New Sample" backHref="/dashboard" />
      <NewSampleForm nextSampleId={nextSampleId} defaultCollectedBy={user.name} />
    </div>
  );
}
