import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Per-field before/after diff for the highest-value audit entries (status transitions, role/active toggles). */
export type AuditMetadata = Record<string, { from: unknown; to: unknown }>;

export async function logAudit(params: {
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  detail?: string;
  metadata?: AuditMetadata;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      detail: params.detail ?? null,
      metadata: (params.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
    },
  });
}
