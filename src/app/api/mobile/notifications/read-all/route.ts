import { NextResponse, type NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { markAllNotificationsRead } from "@/lib/data";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireMobileUser(req);
  if ("error" in auth) return auth.error;

  await markAllNotificationsRead(auth.user.id);
  return NextResponse.json({ ok: true });
}
