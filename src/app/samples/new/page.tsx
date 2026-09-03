import { requirePageUser } from "@/lib/auth";
import { getNextSampleId, getUnreadCount } from "@/lib/data";
import { prisma } from "@/lib/db";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import NewSampleForm from "@/components/NewSampleForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "New Sample" };

export default async function NewSamplePage() {
  const user = await requirePageUser();
  const [nextSampleId, sampleTypes, businessUnits, testCatalogRows, testPanelRows, unread] = await Promise.all([
    getNextSampleId(),
    prisma.sampleTypeCatalog.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, tests: { where: { active: true }, select: { id: true } } },
    }),
    prisma.businessUnit.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.testCatalog.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, spec: true, sampleTypeId: true, sampleType: { select: { name: true } } },
    }),
    prisma.testPanel.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    getUnreadCount(user.id),
  ]);

  const testCatalog = testCatalogRows.map((t) => ({
    id: t.id,
    name: t.name,
    spec: t.spec,
    sampleTypeId: t.sampleTypeId,
    sampleTypeName: t.sampleType.name,
  }));
  const testPanels = testPanelRows.map((p) => ({ id: p.id, name: p.name, testCatalogIds: p.testCatalogIds as string[] }));

  return (
    <div className="min-h-screen flex flex-col bg-white md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="New Sample" backHref="/dashboard" />
      <NewSampleForm
        nextSampleId={nextSampleId}
        defaultCollectedBy={user.name}
        defaultRequestor={user.name}
        sampleTypes={sampleTypes}
        businessUnits={businessUnits}
        testCatalog={testCatalog}
        testPanels={testPanels}
      />
    </div>
  );
}
