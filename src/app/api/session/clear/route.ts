import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

// Cookie mutations are only legal inside a Server Action, Route Handler, or
// middleware — never during a plain page render. requirePageUser() hits a
// stale/deleted-user session from inside a Server Component render, so it
// redirects here instead of clearing the cookie itself; this route handler
// is the legal place to actually delete it before sending the user to /login.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", req.url));
}
