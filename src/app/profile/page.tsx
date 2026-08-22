import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { prisma } from "@/lib/db";
import { ROLE_LABELS, AccessRole, canReviewAsSupervisor, canManageInventoryAndCatalog, isAdmin } from "@/lib/roles";
import BottomNav from "@/components/BottomNav";
import { signOutAction } from "@/lib/actions/auth";
import SectionLabel from "@/components/ui/SectionLabel";
import Chevron from "@/components/ui/Chevron";

export default async function ProfilePage() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const [user, unread] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    getUnreadCount(userId),
  ]);
  if (!user) return null;

  const role = user.accessRole;

  return (
    <div className="min-h-screen flex flex-col bg-page-bg">
      <div className="px-5 pt-6 pb-4 bg-white border-b border-border">
        <h1 className="text-[19px] font-bold text-text tracking-tight">Profile</h1>
      </div>

      <div className="flex-1 p-5 flex flex-col gap-5">
        <div className="bg-white border border-border rounded-xl p-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center text-base font-bold text-primary shrink-0">
            {user.initials}
          </div>
          <div>
            <div className="text-[15px] font-bold text-text">{user.name}</div>
            <div className="text-xs text-muted mt-0.5">
              {user.role} · {user.section}
            </div>
            <div className="text-[11px] text-faint mt-0.5">
              Employee ID: {user.employeeId} · {ROLE_LABELS[role as AccessRole] ?? role}
            </div>
          </div>
        </div>

        {(canReviewAsSupervisor(role) || canManageInventoryAndCatalog(role)) && (
          <div>
            <SectionLabel className="mb-2 px-1">Lab Management</SectionLabel>
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              {canReviewAsSupervisor(role) && <SettingsRow label="Deviations" href="/deviations" />}
              {canManageInventoryAndCatalog(role) && (
                <>
                  <SettingsRow label="Sample & Test Catalog" href="/admin/catalog" />
                  <SettingsRow label="Reagents" href="/inventory/reagents" />
                  <SettingsRow label="Equipment" href="/inventory/equipment" />
                </>
              )}
              {isAdmin(role) && (
                <>
                  <SettingsRow label="Users" href="/admin/users" />
                  <SettingsRow label="Audit Log" href="/admin/audit" last />
                </>
              )}
            </div>
          </div>
        )}

        <div>
          <SectionLabel className="mb-2 px-1">Settings</SectionLabel>
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <SettingsRow label="Change Password" href="/profile/change-password" />
            <SettingsRow label="Help & Support" href="/help" last />
          </div>
        </div>

        <form action={signOutAction}>
          <button
            type="submit"
            className="w-full text-center text-[13px] font-semibold text-danger py-3.5 cursor-pointer"
          >
            Sign Out
          </button>
        </form>
        <div className="text-center text-[11px] text-faint mt-auto">LIMS Mobile · v1.4.2</div>
      </div>

      <BottomNav active="profile" hasUnread={unread > 0} />
    </div>
  );
}

function SettingsRow({ label, href, last }: { label: string; href?: string; last?: boolean }) {
  const content = (
    <div className={`flex items-center justify-between px-4 py-3.5 ${last ? "" : "border-b border-border-soft"}`}>
      <span className="text-[13px] font-medium text-text">{label}</span>
      <Chevron />
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
