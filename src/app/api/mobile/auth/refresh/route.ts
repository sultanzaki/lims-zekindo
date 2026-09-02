import { NextResponse, type NextRequest } from "next/server";
import {
  rotateRefreshToken,
  issueAccessToken,
  toMobileUser,
  ACCESS_TOKEN_TTL_SECONDS,
} from "@/lib/mobile-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : "";

  if (!refreshToken) {
    return NextResponse.json({ ok: false, error: "Missing refresh token." }, { status: 400 });
  }

  const result = await rotateRefreshToken(refreshToken);
  if ("error" in result) {
    return NextResponse.json(
      { ok: false, error: "Session expired. Please log in again." },
      { status: 401 }
    );
  }

  const accessToken = await issueAccessToken(result.user.id);

  return NextResponse.json({
    ok: true,
    accessToken,
    refreshToken: result.refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: toMobileUser(result.user),
  });
}
