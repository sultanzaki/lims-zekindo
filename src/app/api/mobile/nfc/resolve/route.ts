import { NextResponse, type NextRequest } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { resolveNfcToken } from "@/lib/nfc-resolve";

export const runtime = "nodejs";

// Deliberately narrower than the web scan page: mobile only resolves
// SAMPLE tags. Equipment/reagent NFC stays web-only for now, keeping the
// mobile API surface (and the app's screens) to what a lab tech actually
// needs on the floor.
export async function POST(req: NextRequest) {
  const auth = await requireMobileUser(req);
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const rawText = typeof body?.token === "string" ? body.token : "";
  if (!rawText) {
    return NextResponse.json({ ok: false, error: "Missing token." }, { status: 400 });
  }

  const result = await resolveNfcToken(rawText);

  if (result.status === "unknown") {
    return NextResponse.json({ ok: false, error: "Unrecognized tag." }, { status: 404 });
  }
  if (result.status === "inactive") {
    return NextResponse.json({ ok: false, error: "This tag has been deactivated." }, { status: 410 });
  }
  if (result.entityType !== "SAMPLE") {
    return NextResponse.json(
      {
        ok: false,
        error: "This tag is registered to equipment/reagent inventory, which isn't available in the mobile app yet.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, sampleId: result.entityId });
}
