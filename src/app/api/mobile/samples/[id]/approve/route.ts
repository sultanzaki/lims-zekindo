import { NextResponse, type NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { approveSampleForAssistant } from "@/lib/actions/samples";

export const runtime = "nodejs";

// Reuses the exact same password-gated, stage-detecting approve function the
// AI assistant's confirm route (src/app/api/assistant/confirm) already
// calls — same role gate (canReviewAsSupervisor/canApproveAsQa), same status
// transition, same audit entry, same notification, whichever stage
// (supervisor or QA) the sample is actually in.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(req);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  const result = await approveSampleForAssistant(id, auth.user, password);
  return NextResponse.json(result);
}
