// Wire-format types shared between the AssistantWidget client component and
// the /api/assistant/* route handlers. Deliberately hand-rolled and minimal
// (not imported from the `openai` package) so this file stays safe to import
// from client components — the full SDK is a server-only dependency.

export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

export type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type ActionProposal = {
  toolCallId: string;
  tool: string;
  description: string;
  args: Record<string, unknown>;
};
