import { getSessionUserId } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { prisma } from "@/lib/db";
import BottomNav from "@/components/BottomNav";
import { signOutAction } from "@/lib/actions/auth";

export default async function ProfilePage() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const [user, unread] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    getUnreadCount(userId),
  ]);
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <div className="px-5 pt-6 pb-3 bg-white border-b border-border">
        <div className="text-xl font-bold text-text">Profile</div>
      </div>

      <div className="flex-1 p-5 flex flex-col gap-5">
        <div className="bg-white border border-border rounded-2xl p-4.5 flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-full bg-surface-alt flex items-center justify-center text-lg font-bold text-primary shrink-0">
            {user.initials}
          </div>
          <div>
            <div className="text-base font-bold text-text">{user.name}</div>
            <div className="text-xs text-muted mt-0.5">
              {user.role} · {user.section}
            </div>
            <div className="text-[11px] text-faint mt-0.5">Employee ID: {user.employeeId}</div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl overflow-hidden">
          <SettingsRow label="Notification Preferences" />
          <SettingsRow label="Change Password" />
          <SettingsRow label="Help & Support" last />
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

function SettingsRow({ label, last }: { label: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3.5 ${last ? "" : "border-b border-border-soft"}`}>
      <span className="text-[13px] font-medium text-text">{label}</span>
      <svg width="8" height="14" viewBox="0 0 8 14">
        <path d="M1 1l6 6-6 6" stroke="#C8D6DF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
