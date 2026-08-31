import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireMobileUser } from "@/lib/mobile-auth";
import { submitTestResultCore } from "@/lib/sample-actions-core";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; testId: string }> }) {
  const auth = await requireMobileUser(req);
  if ("error" in auth) return auth.error;

  const { id: sampleId, testId } = await params;
  const body = await req.json().catch(() => null);
  const result = typeof body?.result === "string" ? body.result : "";
  const notes = typeof body?.notes === "string" ? body.notes : "";

  const outcome = await submitTestResultCore(auth.user, sampleId, testId, result, notes);
  if (!outcome.ok) {
    return NextResponse.json({ ok: false, error: outcome.error }, { status: 400 });
  }

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath(`/samples/${sampleId}`);
  return NextResponse.json({ ok: true });
}
