"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canReviewAsSupervisor } from "@/lib/roles";

export type FormState = { error?: string };

export async function updateDeviationAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // Matches the page-level gate on /deviations (Supervisor+) — the UI hiding
  // this form for Technicians isn't enough on its own, the action must also
  // enforce it server-side.
  const user = await requireRole(canReviewAsSupervisor);
  const deviationId = String(formData.get("deviationId") || "");
  const rootCause = String(formData.get("rootCause") || "").trim();
  const capa = String(formData.get("capa") || "").trim();
  const close = formData.get("close") === "true";
  const assigneeId = String(formData.get("assigneeId") || "").trim();
  const dueDateRaw = String(formData.get("dueDate") || "").trim();
  const severityRaw = String(formData.get("severity") || "").trim();
  const severity = ["Minor", "Major", "Critical"].includes(severityRaw) ? severityRaw : null;

  const deviation = await prisma.deviation.findUnique({ where: { id: deviationId } });
  if (!deviation) return { error: "Deviation not found." };

  await prisma.deviation.update({
    where: { id: deviationId },
    data: {
      rootCause: rootCause || deviation.rootCause,
      capa: capa || deviation.capa,
      status: close ? "Closed" : "Investigating",
      closedAt: close ? new Date() : null,
      assigneeId: assigneeId || null,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      severity,
    },
  });

  await logAudit({
    userId: user.id,
    action: close ? "deviation.closed" : "deviation.updated",
    entityType: "Deviation",
    entityId: deviationId,
  });

  revalidatePath("/deviations");
  revalidatePath(`/samples/${deviation.sampleId}`);
  return {};
}
