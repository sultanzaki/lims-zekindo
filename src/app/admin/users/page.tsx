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
      <div className="flex-1 px-5 md:px-8 pt-4.5 pb-7 flex flex-col gap-4 md:max-w-[1200px] md:w-full">
        <div className="md:max-w-[640px]">
          <CreateUserForm />
        </div>

        <div className="flex flex-col gap-2 md:hidden">
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

        <div className="hidden md:block bg-white border border-border rounded-2xl shadow-card-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left border-collapse">
            <thead>
              <tr className="border-b border-border-soft">
                <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-4">Name</th>
                <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Email</th>
                <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Role</th>
                <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Status</th>
                <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border-soft last:border-b-0 hover:bg-chip-bg transition-colors">
                  <td className="py-2.5 px-4 text-[13px] font-semibold text-text">{u.name}</td>
                  <td className="py-2.5 px-3 text-[13px] text-muted">{u.email}</td>
                  <td className="py-2.5 px-3 text-[13px] text-muted">{ROLE_LABELS[u.accessRole as AccessRole] ?? u.accessRole}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                      style={{
                        background: u.active ? "#E6F4EA" : "#FDECEA",
                        color: u.active ? "#1E7A34" : "#B00016",
                      }}
                    >
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 pr-4">
                    <div className="flex items-center gap-3">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
