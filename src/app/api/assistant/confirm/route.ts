import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { findTool } from "@/lib/ai/tools";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json();
  const toolName = String(body?.tool || "");
  const args = body?.args && typeof body.args === "object" ? body.args : {};

  const tool = findTool(toolName);
  if (!tool || tool.readonly) {
    return NextResponse.json({ ok: false, error: "That action isn't recognized." }, { status: 400 });
  }

  // For password-gated tools (approve/reject), the password came from a
  // field the human typed directly into the confirm card, sent separately
  // from `args` — the model never sees or generates it. Merge it in here,
  // right before executing, so the tool's own run() signature stays uniform.
  const finalArgs = tool.needsPassword ? { ...args, password: String(body?.password ?? "") } : args;

  try {
    // This calls the exact same server action a manual form submit on that
    // page would call — same role gate (requireRole inside it, which throws
    // if the logged-in user isn't allowed), same DB writes, same audit log
    // entry, same notifications. The assistant never has its own write path.
    const result = await tool.run(finalArgs, user);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Action failed." });
  }
}
