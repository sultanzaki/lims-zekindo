import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import SampleTestCatalogClient from "@/components/SampleTestCatalogClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sample & Test Catalog" };

export default async function AdminCatalogPage() {
  const user = await requirePageRole(canManageInventoryAndCatalog);
  const [sampleTypes, testPanelRows, unread] = await Promise.all([
    prisma.sampleTypeCatalog.findMany({
      orderBy: { name: "asc" },
      include: { tests: { orderBy: { order: "asc" } } },
    }),
    prisma.testPanel.findMany({ orderBy: { name: "asc" } }),
    getUnreadCount(user.id),
  ]);

  const allTests = new Map(sampleTypes.flatMap((st) => st.tests.map((t) => [t.id, t.name])));
  const testPanels = testPanelRows.map((p) => ({
    id: p.id,
    name: p.name,
    active: p.active,
    testNames: (p.testCatalogIds as string[]).map((id) => allTests.get(id) ?? "(deleted test)"),
  }));

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Sample & Test Catalog" backHref="/profile" hideDesktop />
      <SampleTestCatalogClient sampleTypes={sampleTypes} testPanels={testPanels} />
    </div>
  );
}
