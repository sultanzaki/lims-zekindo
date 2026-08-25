import type { NextRequest } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { requireUser } from "@/lib/auth";
import { getAiClient, AI_MODEL } from "@/lib/ai/client";
import { findTool, toOpenAiTools } from "@/lib/ai/tools";
import type { ChatMessage } from "@/lib/ai/types";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are the assistant embedded in Zekindo's LIMS (Laboratory Information Management System).

Answer only from tool results — never guess a sample ID, reagent name, equipment name, or any number from memory. If you need a fact, call a tool for it.

Before proposing record_reagent_usage, log_equipment_calibration, or change_equipment_status, always call the matching search tool first (search_reagent_stock / search_equipment) to resolve the exact ID — never invent one.

Every call to record_reagent_usage, log_equipment_calibration, or change_equipment_status is shown to the user as a card they must explicitly confirm before anything happens — you are only ever proposing it, not executing it yourself. So it's fine, and expected, to go ahead and call the tool once you have enough information; you don't need to ask "should I do this?" in text first, the confirmation step handles that.

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
