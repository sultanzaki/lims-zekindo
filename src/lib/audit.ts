import { prisma } from "@/lib/db";

export async function logAudit(params: {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  detail?: string;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      detail: params.detail ?? null,
    },
  });
}
