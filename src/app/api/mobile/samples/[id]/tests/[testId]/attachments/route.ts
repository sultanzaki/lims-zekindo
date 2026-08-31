import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireMobileUser } from "@/lib/mobile-auth";
import { uploadTestAttachmentCore } from "@/lib/sample-actions-core";

export const runtime = "nodejs";

// Multipart upload — React Native's fetch FormData sends a { uri, name,
// type } part, which arrives here as a standard web File once
// request.formData() parses it, same as a browser upload. No server-side
// difference from the web upload path beyond that.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; testId: string }> }) {
  const auth = await requireMobileUser(req);
  if ("error" in auth) return auth.error;

  const { id: sampleId, testId } = await params;
  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Choose a file to upload." }, { status: 400 });
  }

  const outcome = await uploadTestAttachmentCore(auth.user, sampleId, testId, file);
  if (!outcome.ok) {
    return NextResponse.json({ ok: false, error: outcome.error }, { status: 400 });
  }

  revalidatePath(`/samples/${sampleId}/tests/${testId}`);
  return NextResponse.json({ ok: true });
}
