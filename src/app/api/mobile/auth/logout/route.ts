import { NextResponse, type NextRequest } from "next/server";
import { revokeRefreshToken } from "@/lib/mobile-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : "";

  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  return NextResponse.json({ ok: true });
}
