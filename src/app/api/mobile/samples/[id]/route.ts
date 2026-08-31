import { NextResponse, type NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { getSampleDetail } from "@/lib/data";
import { signedAttachmentUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(req);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const sample = await getSampleDetail(id);
  if (!sample) {
    return NextResponse.json({ ok: false, error: "Sample not found." }, { status: 404 });
  }

  // Never hand the mobile client a raw Supabase storage path — swap it for
  // a short-lived signed URL, same as the web sample-detail page does, so
  // the client never needs its own storage credentials.
  const tests = await Promise.all(
    sample.tests.map(async (test) => ({
      ...test,
      attachments: await Promise.all(
        test.attachments.map(async (a) => ({
          id: a.id,
          fileName: a.fileName,
          fileType: a.fileType,
          fileSize: a.fileSize,
          uploadedBy: a.uploadedBy,
          uploadedAt: a.uploadedAt,
          url: await signedAttachmentUrl(a.storagePath),
        }))
      ),
    }))
  );

  const reports = await Promise.all(
    sample.reports.map(async (r) => ({
      id: r.id,
      fileName: r.fileName,
      fileType: r.fileType,
      fileSize: r.fileSize,
      uploadedBy: r.uploadedBy,
      uploadedAt: r.uploadedAt,
      url: await signedAttachmentUrl(r.storagePath),
    }))
  );

  return NextResponse.json({ ok: true, sample: { ...sample, tests, reports } });
}
