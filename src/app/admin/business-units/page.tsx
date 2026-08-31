import { headers } from "next/headers";
import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import BusinessUnitsListClient from "@/components/BusinessUnitsListClient";

export default async function AdminBusinessUnitsPage() {
  const user = await requirePageRole(canManageInventoryAndCatalog);
  const [businessUnits, unread] = await Promise.all([
    prisma.businessUnit.findMany({ orderBy: { name: "asc" } }),
    getUnreadCount(user.id),
  ]);

  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const portalUrlFor = (token: string) => (host ? `${proto}://${host}/portal/${token}` : null);

  const rows = businessUnits.map((bu) => ({
    id: bu.id,
    name: bu.name,
    active: bu.active,
    portalUrl: bu.portalToken ? portalUrlFor(bu.portalToken) : null,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Business Units" backHref="/profile" hideDesktop />
      <BusinessUnitsListClient units={rows} />
    </div>
  );
}
