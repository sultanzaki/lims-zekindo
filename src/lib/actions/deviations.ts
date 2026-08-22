"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export type FormState = { error?: string };

export async function updateDeviationAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const deviationId = String(formData.get("deviationId") || "");
  const rootCause = String(formData.get("rootCause") || "").trim();
  const capa = String(formData.get("capa") || "").trim();
  const close = formData.get("close") === "true";

  const deviation = await prisma.deviation.findUnique({ where: { id: deviationId } });
  if (!deviation) return { error: "Deviation not found." };

  await prisma.deviation.update({
    where: { id: deviationId },
    data: {
      rootCause: rootCause || deviation.rootCause,
      capa: capa || deviation.capa,
      status: close ? "Closed" : "Investigating",
      closedAt: close ? new Date() : null,
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
