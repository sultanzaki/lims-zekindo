import { NextResponse, type NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { getSampleDetail } from "@/lib/data";
import { prisma } from "@/lib/db";
import { signedUrlFor } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileUser(req);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const sample = await getSampleDetail(id);
  if (!sample) {
    return NextResponse.json({ ok: false, error: "Sample not found." }, { status: 404 });
  }

  // getSampleDetail() (shared with the web sample-detail page) doesn't
  // include readings — the web app only fetches those on the separate
  // per-test entry page. The mobile app enters readings from this same
  // Sample Detail screen, so fetch them here instead of widening the
  // shared helper for web's sake too.
  const testIds = sample.tests.map((t) => t.id);
  const readings = testIds.length
    ? await prisma.testReading.findMany({ where: { testId: { in: testIds } }, orderBy: { takenAt: "asc" } })
    : [];
  const readingsByTest = new Map<string, typeof readings>();
  for (const reading of readings) {
    const list = readingsByTest.get(reading.testId) ?? [];
    list.push(reading);
    readingsByTest.set(reading.testId, list);
  }

  // Never hand the mobile client a raw Supabase storage path — swap it for
  // a short-lived signed URL, same as the web sample-detail page does, so
  // the client never needs its own storage credentials.
  const tests = await Promise.all(
    sample.tests.map(async (test) => ({
      ...test,
      readings: readingsByTest.get(test.id) ?? [],
      attachments: await Promise.all(
        test.attachments.map(async (a) => ({
          id: a.id,
          fileName: a.fileName,
          fileType: a.fileType,
          fileSize: a.fileSize,
          uploadedBy: a.uploadedBy,
          uploadedAt: a.uploadedAt,
          url: await signedUrlFor(a.fileType, a.storagePath),
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
      url: await signedUrlFor(r.fileType, r.storagePath),
    }))
  );

  return NextResponse.json({ ok: true, sample: { ...sample, tests, reports } });
}
