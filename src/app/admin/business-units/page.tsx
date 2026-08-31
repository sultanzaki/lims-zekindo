import { headers } from "next/headers";
import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import { CreateBusinessUnitForm } from "@/components/CatalogForms";
import BusinessUnitPortalRow from "@/components/BusinessUnitPortalRow";
import { setBusinessUnitActiveAction } from "@/lib/actions/catalog";

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

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Business Units" backHref="/profile" />
      <div className="flex-1 px-5 md:px-8 pt-4.5 pb-7 flex flex-col gap-4 md:max-w-[640px] md:w-full">
        <p className="text-xs text-muted -mt-1">
          The requesting business units that samples can be logged against — managed separately from the sample &amp; test catalog.
        </p>
        <CreateBusinessUnitForm />
        <div className="bg-white border border-border rounded-2xl shadow-card-sm overflow-hidden">
          {businessUnits.map((bu, i) => (
            <div
              key={bu.id}
              className={`flex flex-col gap-2.5 px-3.5 py-3 text-xs ${i < businessUnits.length - 1 ? "border-b border-border-soft" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={bu.active ? "font-medium text-text" : "font-medium text-muted line-through"}>{bu.name}</span>
                <form action={setBusinessUnitActiveAction.bind(null, bu.id, !bu.active)}>
                  <button type="submit" className={`text-[11px] font-semibold cursor-pointer ${bu.active ? "text-danger" : "text-success-dark"}`}>
                    {bu.active ? "Deactivate" : "Reactivate"}
                  </button>
                </form>
              </div>
              <div className="flex justify-end">
                <BusinessUnitPortalRow
                  buId={bu.id}
                  buName={bu.name}
                  portalUrl={bu.portalToken ? portalUrlFor(bu.portalToken) : null}
                />
              </div>
            </div>
          ))}
          {businessUnits.length === 0 && <div className="px-3.5 py-3 text-xs text-muted">No business units yet — add one above.</div>}
        </div>
      </div>
    </div>
  );
}
