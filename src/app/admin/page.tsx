import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canReviewAsSupervisor, canManageInventoryAndCatalog, canViewAnalytics, isAdmin } from "@/lib/roles";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import SectionLabel from "@/components/ui/SectionLabel";
import Chevron from "@/components/ui/Chevron";
import Link from "next/link";

export default async function AdminHubPage() {
  const user = await requirePageRole((role) => canReviewAsSupervisor(role) || canManageInventoryAndCatalog(role));
  const role = user.accessRole;
  const unread = await getUnreadCount(user.id);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={role} userName={user.name} unreadCount={unread} />
      <BackHeader title="Lab Management" backHref="/profile" />
      <div className="flex-1 px-5 md:px-8 pt-4.5 pb-7 flex flex-col gap-5 md:max-w-[640px] md:w-full">
        {(canViewAnalytics(role) || canReviewAsSupervisor(role)) && (
          <div>
            <SectionLabel className="mb-2.5 px-1">Insights</SectionLabel>
            <div className="bg-white border border-border rounded-[18px] shadow-card overflow-hidden">
              {canViewAnalytics(role) && <SettingsRow label="Analytics" href="/analytics" />}
              {canReviewAsSupervisor(role) && <SettingsRow label="Deviations" href="/deviations" last />}
            </div>
          </div>
        )}

        {canManageInventoryAndCatalog(role) && (
          <div>
            <SectionLabel className="mb-2.5 px-1">Catalog &amp; Inventory</SectionLabel>
            <div className="bg-white border border-border rounded-[18px] shadow-card overflow-hidden">
              <SettingsRow label="Sample & Test Catalog" href="/admin/catalog" />
              <SettingsRow label="Business Units" href="/admin/business-units" />
              <SettingsRow label="Reagents & Chemicals" href="/inventory/reagents" />
              <SettingsRow label="Equipment" href="/inventory/equipment" />
              <SettingsRow label="Warehouse" href="/inventory/warehouse" last />
            </div>
          </div>
        )}

        {isAdmin(role) && (
          <div>
            <SectionLabel className="mb-2.5 px-1">Administration</SectionLabel>
            <div className="bg-white border border-border rounded-[18px] shadow-card overflow-hidden">
              <SettingsRow label="Users" href="/admin/users" />
              <SettingsRow label="Audit Log" href="/admin/audit" last />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsRow({ label, href, last }: { label: string; href: string; last?: boolean }) {
  return (
    <Link href={href}>
      <div className={`flex items-center justify-between px-4 py-3.5 min-h-[52px] ${last ? "" : "border-b border-border-soft"}`}>
        <span className="text-sm font-medium text-text">{label}</span>
        <Chevron />
      </div>
    </Link>
  );
}
