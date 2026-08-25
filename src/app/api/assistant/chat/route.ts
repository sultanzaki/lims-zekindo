import type { NextRequest } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { requireUser } from "@/lib/auth";
import { getAiClient, AI_MODEL } from "@/lib/ai/client";
import { findTool, toOpenAiTools } from "@/lib/ai/tools";
import type { ChatMessage } from "@/lib/ai/types";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are the assistant embedded in Zekindo's LIMS (Laboratory Information Management System).

Answer only from tool results — never guess a sample ID, reagent name, equipment name, status, or any number from memory or by inference. If a tool doesn't directly cover what was asked, call a different tool that does, or say plainly you don't have that information — never derive an answer from a tool that answers a different question (e.g. get_overdue_samples only covers samples that are currently open AND past due; an empty result from it means nothing about how many samples are Complete, Rejected, or in any other stage — that requires list_samples or get_sample_status_breakdown instead).

Tool selection for common questions:
- "which/how many samples are [status]", "show me all samples", "overview of samples" → list_samples (with a status filter if one was named) or get_sample_status_breakdown for a full count-by-status view. Never get_overdue_samples for these.
- "which samples are overdue / late / past due" → get_overdue_samples.
- one specific sample by ID → get_sample_status.
- stock / low stock / expiring → get_low_stock_reagents or search_reagent_stock.
- calibration due / equipment status → get_upcoming_calibrations or search_equipment; one specific equipment's full history → get_equipment_detail.
- one specific reagent's full history → get_reagent_detail.
- open deviations / OOS / CAPA → get_deviations.
- technician performance → get_technician_performance. Predicted turnaround per sample type → get_tat_predictions.
- lab staff directory (who has what role) → list_users (Admin only).
- "my notifications" / "what's waiting for me" → get_my_notifications.
- analytics / insight / performance summary → get_analytics_summary, then WRITE A SHORT NARRATIVE from it (2-4 sentences, plain language, like briefing a manager) — do not just list the raw fields back. Call out what actually matters: TAT compliance, pass rate, overdue/equipment/reagent alert counts, and the top anomaly if any, in that kind of priority order. Only mention numbers that are actually concerning or notably good — skip fields that are unremarkable.

Before proposing record_reagent_usage, log_equipment_calibration, log_equipment_maintenance, change_equipment_status, or mark_sample_disposed, always call the matching search/status tool first (search_reagent_stock / search_equipment / get_sample_status) to resolve the exact ID and confirm the precondition (e.g. mark_sample_disposed only works on a Complete, not-yet-disposed sample) — never invent an ID or assume a precondition holds.

Every write tool call is shown to the user as a card they must explicitly confirm before anything happens — you are only ever proposing it, not executing it yourself. So it's fine, and expected, to go ahead and call the tool once you have enough information; you don't need to ask "should I do this?" in text first, the confirmation step handles that.

Rich result cards for tool data (sample lists, status breakdowns, stock alerts, etc.) are already shown to the user separately in the UI — don't repeat every row/number back in your text reply. Just add a short, useful comment on top (what stands out, what needs attention), the way a colleague would when handing you a printout.

If a tool result contains an "error" field, that means the user's role doesn't allow that action or data — tell them plainly, don't retry.

Reply in the same language the user writes in (Indonesian or English). Keep answers short and concrete — numbers and names, not filler.`;

const MAX_ROUNDS = 6;

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json();
  const clientMessages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: Record<string, unknown>) {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      function finish() {
        if (closed) return;
        closed = true;
        controller.close();
      }

      try {
        const client = getAiClient();
        const messages = [
          { role: "system", content: SYSTEM_PROMPT },
          ...clientMessages,
        ] as ChatCompletionMessageParam[];

        for (let round = 0; round < MAX_ROUNDS; round++) {
          const completion = await client.chat.completions.create({
            model: AI_MODEL,
            messages,
            tools: toOpenAiTools(),
            stream: true,
            temperature: 0.3,
          });

          let assistantText = "";
          const toolCallsAccum: Record<number, { id: string; name: string; args: string }> = {};

          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              assistantText += delta.content;
              send({ type: "text", delta: delta.content });
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index;
                if (!toolCallsAccum[idx]) toolCallsAccum[idx] = { id: "", name: "", args: "" };
                if (tc.id) toolCallsAccum[idx].id = tc.id;
                if (tc.function?.name) toolCallsAccum[idx].name += tc.function.name;
                if (tc.function?.arguments) toolCallsAccum[idx].args += tc.function.arguments;
              }
            }
          }

          const toolCalls = Object.values(toolCallsAccum).filter((tc) => tc.id && tc.name);
          if (toolCalls.length === 0) {
            finish();
            return;
          }

          messages.push({
            role: "assistant",
            content: assistantText || null,
            tool_calls: toolCalls.map((tc) => ({
              id: tc.id,
              type: "function" as const,
              function: { name: tc.name, arguments: tc.args },
            })),
          });

          let pausedForConfirmation = false;

          for (const tc of toolCalls) {
            const tool = findTool(tc.name);
            let args: Record<string, unknown> = {};
            try {
              args = tc.args ? JSON.parse(tc.args) : {};
            } catch {
              // leave args empty — the tool's own run/describe will surface a clear error
            }

            if (!tool) {
              messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify({ error: "Unknown tool" }) });
              continue;
            }

            if (tool.readonly) {
              let result: unknown;
              try {
                result = await tool.run(args, user);
              } catch (e) {
                result = { error: e instanceof Error ? e.message : "Tool failed." };
              }
              // Sent to the client as its own event (for a rich card) in
              // addition to being fed back into the model's context below —
              // the two don't have to render the same way.
              send({ type: "tool_result", tool: tool.name, args, result });
              messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
            } else {
              let description = tool.name;
              try {
                description = await tool.describe(args);
              } catch {
                // fall back to the raw tool name
              }
              send({ type: "action_proposal", toolCallId: tc.id, tool: tool.name, description, args });
              pausedForConfirmation = true;
              break;
            }
          }

          if (pausedForConfirmation) {
            finish();
            return;
          }
          // else: read-tool results are now in `messages` — loop again so the
          // model can call more tools or give its final plain-text answer.
        }

        finish();
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "The assistant hit an error." });
        finish();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
