import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { isAdmin, ROLE_LABELS, AccessRole } from "@/lib/roles";
import { prisma } from "@/lib/db";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import UsersListClient from "@/components/UsersListClient";

export default async function AdminUsersPage() {
  const user = await requirePageRole(isAdmin);
  const [users, unread] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    getUnreadCount(user.id),
  ]);

  const rows = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    roleLabel: ROLE_LABELS[u.accessRole as AccessRole] ?? u.accessRole,
    isAdmin: u.accessRole === "ADMIN",
    active: u.active,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Users" backHref="/profile" hideDesktop />
      <UsersListClient users={rows} />
    </div>
  );
}
