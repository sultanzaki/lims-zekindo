import { NextResponse, type NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { prisma } from "@/lib/db";
import { SAMPLE_STATUSES } from "@/lib/status";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireMobileUser(req);
  if ("error" in auth) return auth.error;

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim();

  const samples = await prisma.sample.findMany({
    where: {
      ...(status && (SAMPLE_STATUSES as readonly string[]).includes(status) ? { status } : {}),
      ...(q
        ? {
            OR: [
              { id: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      type: true,
      source: true,
      status: true,
      priority: true,
      collectedBy: true,
      receivedDate: true,
      sampleType: { select: { targetTatHours: true } },
    },
  });

  return NextResponse.json({ ok: true, samples });
}
