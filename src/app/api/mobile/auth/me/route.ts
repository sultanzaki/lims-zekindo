import { NextResponse, type NextRequest } from "next/server";
import { requireMobileUser, toMobileUser } from "@/lib/mobile-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireMobileUser(req);
  if ("error" in auth) return auth.error;

  return NextResponse.json({ ok: true, user: toMobileUser(auth.user) });
}
