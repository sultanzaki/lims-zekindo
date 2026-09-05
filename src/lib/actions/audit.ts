"use server";

import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";

const AUDIT_PAGE_SIZE = 200;

export type AuditEntryRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  detail: string | null;
  metadata: Record<string, { from: unknown; to: unknown }> | null;
  createdAt: Date;
  actorName: string;
};

// Load an older page of audit log entries, used by the admin Audit Log page's
// "Load older" button (keyset pagination on the created cursor, matching the
// page's own orderBy createdAt desc). Returns rows plus whether more remain.
export async function loadOlderAuditEntriesAction(cursorCreatedAt: Date): Promise<{
  rows: AuditEntryRow[];
  hasMore: boolean;
}> {
  const user = await requireRole(isAdmin);

  const entries = await prisma.auditLog.findMany({
    where: { createdAt: { lt: cursorCreatedAt } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: AUDIT_PAGE_SIZE,
    include: { user: { select: { name: true } } },
  });

  const userEntityIds = Array.from(new Set(entries.filter((e) => e.entityType === "User").map((e) => e.entityId)));
  const referencedUsers = userEntityIds.length
    ? await prisma.user.findMany({ where: { id: { in: userEntityIds } }, select: { id: true, name: true } })
    : [];
  const userNameById = new Map(referencedUsers.map((u) => [u.id, u.name]));

  const rows: AuditEntryRow[] = entries.map((e) => ({
    id: e.id,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId,
    entityLabel: e.entityType === "User" ? userNameById.get(e.entityId) ?? null : null,
    detail: e.detail,
    metadata: e.metadata as Record<string, { from: unknown; to: unknown }> | null,
    createdAt: e.createdAt,
    actorName: e.user?.name ?? "System",
  }));

  const hasMore = entries.length === AUDIT_PAGE_SIZE;
  return { rows, hasMore };
}
