"use client";

import { useRef, useState } from "react";
import type { ActionProposal, ChatMessage } from "@/lib/ai/types";

function AssistantIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a2 2 0 012 2v1h1a3 3 0 013 3v6a3 3 0 01-3 3H9a3 3 0 01-3-3V9a3 3 0 013-3h1V5a2 2 0 012-2z" />
      <path d="M8 12h.01" />
      <path d="M16 12h.01" />
      <path d="M9 17h6" />
    </svg>
  );
}

async function readSseEvents(
  response: Response,
  onEvent: (event: Record<string, unknown>) => void
) {
  if (!response.body) throw new Error("No response stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr) continue;
      try {
        onEvent(JSON.parse(jsonStr));
      } catch {
        // ignore malformed chunk
      }
    }
  }
}

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingProposal, setPendingProposal] = useState<ActionProposal | null>(null);
  const [proposalBusy, setProposalBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  async function streamChat(nextMessages: ChatMessage[]) {
    setBusy(true);
    setError(null);
    let assistantText = "";
    let draftIndex = -1;

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      if (!res.ok) throw new Error("The assistant is unavailable right now.");

      await readSseEvents(res, (event) => {
        if (event.type === "text") {
          assistantText += String(event.delta ?? "");
          setMessages((prev) => {
            const copy = [...prev];
            const msg: ChatMessage = { role: "assistant", content: assistantText };
            if (draftIndex === -1) {
              draftIndex = copy.length;
              copy.push(msg);
            } else {
              copy[draftIndex] = msg;
            }
            return copy;
          });
          scrollToBottom();
        } else if (event.type === "action_proposal") {
          const proposal: ActionProposal = {
            toolCallId: String(event.toolCallId),
            tool: String(event.tool),
            description: String(event.description),
            args: (event.args as Record<string, unknown>) ?? {},
          };
          setMessages((prev) => {
            const copy = [...prev];
            const msg: ChatMessage = {
              role: "assistant",
              content: assistantText || null,
              tool_calls: [
                { id: proposal.toolCallId, type: "function", function: { name: proposal.tool, arguments: JSON.stringify(proposal.args) } },
              ],
            };
            if (draftIndex === -1) copy.push(msg);
            else copy[draftIndex] = msg;
            return copy;
          });
          setPendingProposal(proposal);
          scrollToBottom();
        } else if (event.type === "error") {
          setError(String(event.message ?? "The assistant hit an error."));
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reach the assistant.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || busy || pendingProposal) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    scrollToBottom();
    await streamChat(next);
  }

  async function handleConfirm() {
    if (!pendingProposal) return;
    setProposalBusy(true);
    try {
      const res = await fetch("/api/assistant/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: pendingProposal.tool, args: pendingProposal.args }),
      });
      const result = await res.json();
      const next: ChatMessage[] = [
        ...messages,
        { role: "tool", tool_call_id: pendingProposal.toolCallId, content: JSON.stringify(result) },
      ];
      setMessages(next);
      setPendingProposal(null);
      setProposalBusy(false);
      await streamChat(next);
    } catch (e) {
      setProposalBusy(false);
      setError(e instanceof Error ? e.message : "Couldn't complete that action.");
    }
  }

  async function handleCancel() {
    if (!pendingProposal) return;
    const next: ChatMessage[] = [
      ...messages,
      { role: "tool", tool_call_id: pendingProposal.toolCallId, content: JSON.stringify({ cancelled: true, note: "The user declined this action." }) },
    ];
    setMessages(next);
    setPendingProposal(null);
    await streamChat(next);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open assistant"
        className="fixed bottom-[86px] md:bottom-6 right-5 z-40 w-14 h-14 rounded-full bg-primary shadow-[0_8px_24px_rgba(26,95,122,0.4)] flex items-center justify-center"
      >
        <AssistantIcon />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-end justify-center md:justify-end p-0 md:p-6 bg-black/30 md:bg-transparent" onClick={() => setOpen(false)}>
          <div
            className="w-full md:w-[380px] h-[85vh] md:h-[560px] max-h-[85vh] bg-white md:rounded-[20px] rounded-t-[20px] shadow-[0_12px_40px_rgba(16,42,58,0.25)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border-soft bg-primary-soft shrink-0">
              <div>
                <div className="text-[13px] font-bold text-primary-dark">LIMS Assistant</div>
                <div className="text-[10px] text-primary-dark/70">Ask about samples, stock, or calibration</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center text-primary-dark hover:bg-white/50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col gap-2.5">
              {messages.length === 0 && (
                <div className="text-xs text-muted bg-chip-bg rounded-[14px] px-3.5 py-3 self-start max-w-[85%]">
                  Halo! Tanya apa saja soal sampel yang overdue, stok reagen, jadwal kalibrasi, atau minta ringkasan analytics. Aksi
                  seperti catat pemakaian reagen atau ubah status equipment akan selalu saya tunjukkan dulu sebelum dijalankan.
                </div>
              )}
              {messages.map((m, i) => {
                if (m.role !== "user" && m.role !== "assistant") return null;
                if (!m.content) return null;
                const isUser = m.role === "user";
                return (
                  <div
                    key={i}
                    className={`text-[13px] leading-relaxed rounded-[14px] px-3.5 py-2.5 max-w-[85%] whitespace-pre-wrap ${
                      isUser ? "self-end bg-primary text-white" : "self-start bg-chip-bg text-text"
                    }`}
                  >
                    {m.content}
                  </div>
                );
              })}

              {pendingProposal && (
                <div className="self-start max-w-[92%] bg-warning-bg border border-warning/30 rounded-[14px] px-3.5 py-3 flex flex-col gap-2">
                  <div className="text-[11px] font-semibold text-warning-dark uppercase tracking-wide">Confirm action</div>
                  <div className="text-[13px] text-warning-dark">{pendingProposal.description}</div>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={proposalBusy}
                      className="flex-1 text-xs font-semibold px-3 py-2 rounded-full border border-warning/40 text-warning-dark bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={proposalBusy}
                      className="flex-1 text-xs font-semibold px-3 py-2 rounded-full bg-warning-dark text-white"
                    >
                      {proposalBusy ? "Working…" : "Confirm"}
                    </button>
                  </div>
                </div>
              )}

              {busy && !pendingProposal && (
                <div className="self-start bg-chip-bg rounded-[14px] px-3.5 py-2.5 text-[13px] text-muted">…</div>
              )}
              {error && <div className="self-start text-xs text-danger px-1">{error}</div>}
            </div>

            <div className="border-t border-border-soft p-2.5 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tanya sesuatu…"
                  disabled={busy || !!pendingProposal}
                  className="flex-1 text-[13px] px-3.5 py-2.5 rounded-full border border-border bg-white text-text outline-none placeholder:text-faint disabled:opacity-60 min-w-0"
                />
                <button
                  type="submit"
                  disabled={busy || !!pendingProposal || !input.trim()}
                  aria-label="Send"
                  className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0 disabled:opacity-40"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
