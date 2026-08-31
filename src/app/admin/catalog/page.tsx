import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import SampleTestCatalogClient from "@/components/SampleTestCatalogClient";

export default async function AdminCatalogPage() {
  const user = await requirePageRole(canManageInventoryAndCatalog);
  const [sampleTypes, unread] = await Promise.all([
    prisma.sampleTypeCatalog.findMany({
      orderBy: { name: "asc" },
      include: { tests: { orderBy: { order: "asc" } } },
    }),
    getUnreadCount(user.id),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Sample & Test Catalog" backHref="/profile" hideDesktop />
      <SampleTestCatalogClient sampleTypes={sampleTypes} />
    </div>
  );
}
