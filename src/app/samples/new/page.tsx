import { getCurrentUser } from "@/lib/auth";
import { getNextSampleId } from "@/lib/data";
import { prisma } from "@/lib/db";
import BackHeader from "@/components/BackHeader";
import NewSampleForm from "@/components/NewSampleForm";

export default async function NewSamplePage() {
  const [user, nextSampleId, sampleTypes, businessUnits] = await Promise.all([
    getCurrentUser(),
    getNextSampleId(),
    prisma.sampleTypeCatalog.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.businessUnit.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <BackHeader title="New Sample" backHref="/dashboard" />
      <NewSampleForm
        nextSampleId={nextSampleId}
        defaultCollectedBy={user.name}
        defaultRequestor={user.name}
        sampleTypes={sampleTypes}
        businessUnits={businessUnits}
      />
    </div>
  );
}
