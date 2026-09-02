import { NextResponse, type NextRequest } from "next/server";
import { verifyCredentials } from "@/lib/credentials";
import {
  issueAccessToken,
  createRefreshToken,
  toMobileUser,
  ACCESS_TOKEN_TTL_SECONDS,
} from "@/lib/mobile-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const identifier = typeof body?.identifier === "string" ? body.identifier.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const deviceLabel = typeof body?.deviceLabel === "string" ? body.deviceLabel.slice(0, 200) : undefined;

  if (!identifier || !password) {
    return NextResponse.json(
      { ok: false, error: "Enter your email or employee ID and password." },
      { status: 400 }
    );
  }

  const result = await verifyCredentials(identifier, password);
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
  }

  const accessToken = await issueAccessToken(result.user.id);
  const refreshToken = await createRefreshToken(result.user.id, deviceLabel);

  return NextResponse.json({
    ok: true,
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: toMobileUser(result.user),
  });
}
