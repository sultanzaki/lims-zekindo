import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { isAdmin } from "@/lib/roles";
import { prisma } from "@/lib/db";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import AuditLogClient from "@/components/AuditLogClient";

export default async function AdminAuditPage() {
  const user = await requirePageRole(isAdmin);
  const unread = await getUnreadCount(user.id);
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { user: { select: { name: true } } },
  });

  const userEntityIds = [...new Set(entries.filter((e) => e.entityType === "User").map((e) => e.entityId))];
  const referencedUsers = userEntityIds.length
    ? await prisma.user.findMany({ where: { id: { in: userEntityIds } }, select: { id: true, name: true } })
    : [];
  const userNameById = new Map(referencedUsers.map((u) => [u.id, u.name]));

  const rows = entries.map((e) => ({
    id: e.id,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId,
    entityLabel: e.entityType === "User" ? userNameById.get(e.entityId) ?? null : null,
    detail: e.detail,
    createdAt: e.createdAt,
    actorName: e.user?.name ?? "System",
  }));

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-64">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Audit Log" backHref="/profile" />
      <AuditLogClient entries={rows} />
    </div>
  );
}
