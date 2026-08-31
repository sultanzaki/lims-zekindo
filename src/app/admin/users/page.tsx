import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { isAdmin, ROLE_LABELS, AccessRole } from "@/lib/roles";
import { prisma } from "@/lib/db";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import CreateUserForm from "@/components/CreateUserForm";
import ResetPasswordButton from "@/components/ResetPasswordButton";
import { setUserActiveAction } from "@/lib/actions/admin-users";

export default async function AdminUsersPage() {
  const user = await requirePageRole(isAdmin);
  const [users, unread] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    getUnreadCount(user.id),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Users" backHref="/profile" />
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-4">
        <CreateUserForm />

        <div className="flex flex-col gap-2">
          {users.map((u) => (
            <div key={u.id} className="bg-white border border-border rounded-2xl shadow-card-sm p-3.5 flex items-center justify-between gap-2">
              <div>
                <div className="text-[13px] font-semibold text-text">
                  {u.name} {!u.active && <span className="text-danger font-normal">(inactive)</span>}
                </div>
                <div className="text-[11px] text-muted mt-0.5">
                  {u.email} · {ROLE_LABELS[u.accessRole as AccessRole] ?? u.accessRole}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <ResetPasswordButton userId={u.id} />
                <form action={setUserActiveAction.bind(null, u.id, !u.active)}>
                  <button
                    type="submit"
                    className={`text-[11px] font-semibold cursor-pointer ${u.active ? "text-danger" : "text-success-dark"}`}
                  >
                    {u.active ? "Deactivate" : "Reactivate"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
