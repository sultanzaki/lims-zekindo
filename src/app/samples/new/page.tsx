import { requirePageUser } from "@/lib/auth";
import { getNextSampleId } from "@/lib/data";
import { prisma } from "@/lib/db";
import BackHeader from "@/components/BackHeader";
import NewSampleForm from "@/components/NewSampleForm";

export default async function NewSamplePage() {
  const user = await requirePageUser();
  const [nextSampleId, sampleTypes, businessUnits] = await Promise.all([
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
