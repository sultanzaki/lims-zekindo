import { NextResponse, type NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { rejectSampleForAssistant } from "@/lib/actions/samples";

export const runtime = "nodejs";

// Same reuse as the approve route: this is the exact function the AI
// assistant's confirm route already calls, which detects the stage
// (supervisor vs QA) from the sample's current status and applies the same
// role gate, rejection transition, deviation, and notification either way.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(req);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  const result = await rejectSampleForAssistant(id, auth.user, password);
  return NextResponse.json(result);
}
