import { NextResponse, type NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { getDashboardData, getUnreadCount } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireMobileUser(req);
  if ("error" in auth) return auth.error;

  const [dashboard, unreadCount] = await Promise.all([
    getDashboardData(),
    getUnreadCount(auth.user.id),
  ]);

  return NextResponse.json({
    ok: true,
    role: auth.user.accessRole,
    unreadCount,
    ...dashboard,
  });
}
