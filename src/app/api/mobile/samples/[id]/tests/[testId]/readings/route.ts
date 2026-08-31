import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireMobileUser } from "@/lib/mobile-auth";
import { addTestReadingCore, deleteTestReadingCore } from "@/lib/sample-actions-core";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string; testId: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireMobileUser(req);
  if ("error" in auth) return auth.error;

  const { id: sampleId, testId } = await params;
  const body = await req.json().catch(() => null);
  const value = typeof body?.value === "string" ? body.value : "";
  const intervalLabel = typeof body?.intervalLabel === "string" ? body.intervalLabel : null;
  const replicateIndex = typeof body?.replicateIndex === "number" ? body.replicateIndex : null;
  const note = typeof body?.note === "string" ? body.note : null;

  const outcome = await addTestReadingCore(auth.user, sampleId, testId, {
    value,
    intervalLabel,
    replicateIndex,
    note,
  });
  if (!outcome.ok) {
    return NextResponse.json({ ok: false, error: outcome.error }, { status: 400 });
  }

  revalidatePath(`/samples/${sampleId}/tests/${testId}`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await requireMobileUser(req);
  if ("error" in auth) return auth.error;

  const { id: sampleId, testId } = await params;
  const body = await req.json().catch(() => null);
  const readingId = typeof body?.readingId === "string" ? body.readingId : "";
  if (!readingId) {
    return NextResponse.json({ ok: false, error: "Missing readingId." }, { status: 400 });
  }

  const outcome = await deleteTestReadingCore(sampleId, testId, readingId, auth.user);
  if (!outcome.ok) {
    return NextResponse.json({ ok: false, error: outcome.error }, { status: 400 });
  }

  revalidatePath(`/samples/${sampleId}/tests/${testId}`);
  return NextResponse.json({ ok: true });
}
