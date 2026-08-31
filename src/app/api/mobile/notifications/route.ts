import { NextResponse, type NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { listNotifications } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireMobileUser(req);
  if ("error" in auth) return auth.error;

  const notifications = await listNotifications(auth.user.id);
  return NextResponse.json({ ok: true, notifications });
}
