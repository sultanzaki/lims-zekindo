"use client";

import { useRef, useState } from "react";
import type { ActionProposal, ChatMessage } from "@/lib/ai/types";
import ToolResultCard from "@/components/assistant/ToolResultCard";
import AssistantMarkdown from "@/components/assistant/AssistantMarkdown";
import { inputClassSm } from "@/components/ui/Field";

function AssistantIcon({ size = 24, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a2 2 0 012 2v1h1a3 3 0 013 3v6a3 3 0 01-3 3H9a3 3 0 01-3-3V9a3 3 0 013-3h1V5a2 2 0 012-2z" />
      <path d="M8 12h.01" />
      <path d="M16 12h.01" />
      <path d="M9 17h6" />
    </svg>
  );
}

function MiniCheckIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

type DisplayItem =
  | { id: string; kind: "message"; role: "user" | "assistant"; content: string; streaming?: boolean }
  | { id: string; kind: "tool_result"; tool: string; result: unknown }
  | { id: string; kind: "proposal"; proposal: ActionProposal; status: "pending" | "confirmed" | "cancelled" | "error"; note?: string };

async function readSseEvents(response: Response, onEvent: (event: Record<string, unknown>) => void) {
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
  const [everOpened, setEverOpened] = useState(false);
  const [open, setOpen] = useState(false);
  // Panel stays mounted through the close animation (menu-pop-out) instead
  // of vanishing the instant `open` flips false — see the matching pattern
  // in ui/Modal.tsx.
  const [panelRendered, setPanelRendered] = useState(false);
  const [closing, setClosing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [displayItems, setDisplayItems] = useState<DisplayItem[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingProposals, setPendingProposals] = useState<ActionProposal[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const idCounter = useRef(0);

  function newId() {
    idCounter.current += 1;
    return `d${idCounter.current}`;
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  function updateProposal(toolCallId: string, status: "confirmed" | "cancelled" | "error", note?: string) {
    setDisplayItems((prev) =>
      prev.map((it) => (it.kind === "proposal" && it.proposal.toolCallId === toolCallId ? { ...it, status, note } : it))
    );
  }

  function openWidget() {
    setEverOpened(true);
    setOpen(true);
  }

  // Adjust state during render when `open` changes (React's documented
  // alternative to a setState-in-effect for "reset/react to a prop change")
  // rather than reacting to it a frame later in an effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPanelRendered(true);
      setClosing(false);
    } else if (panelRendered) {
      setClosing(true);
    }
  }

  function stopStreaming() {
    abortRef.current?.abort();
  }

  async function streamChat(nextMessages: ChatMessage[]) {
    setBusy(true);
    setError(null);
    let assistantText = "";
    let assistantItemId: string | null = null;
    const turnProposals: ActionProposal[] = [];
    const controller = new AbortController();
    abortRef.current = controller;

    function pushAssistantDelta() {
      if (!assistantItemId) {
        const id = newId();
        assistantItemId = id;
        setDisplayItems((prev) => [...prev, { id, kind: "message", role: "assistant", content: assistantText, streaming: true }]);
      } else {
        const id = assistantItemId;
        setDisplayItems((prev) => prev.map((it) => (it.id === id ? { ...it, content: assistantText, streaming: true } : it)));
      }
    }

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("The assistant is unavailable right now.");

      await readSseEvents(res, (event) => {
        if (event.type === "text") {
          assistantText += String(event.delta ?? "");
          pushAssistantDelta();
          scrollToBottom();
        } else if (event.type === "tool_result") {
          setDisplayItems((prev) => [...prev, { id: newId(), kind: "tool_result", tool: String(event.tool), result: event.result }]);
          scrollToBottom();
        } else if (event.type === "action_proposal") {
          const proposal: ActionProposal = {
            toolCallId: String(event.toolCallId),
            tool: String(event.tool),
            description: String(event.description),
            args: (event.args as Record<string, unknown>) ?? {},
            needsPassword: Boolean(event.needsPassword),
          };
          turnProposals.push(proposal);
          setDisplayItems((prev) => [...prev, { id: newId(), kind: "proposal", proposal, status: "pending" }]);
          scrollToBottom();
        } else if (event.type === "error") {
          setError(String(event.message ?? "The assistant hit an error."));
        }
      });

      if (assistantItemId) {
        const id = assistantItemId;
        setDisplayItems((prev) => prev.map((it) => (it.id === id ? { ...it, streaming: false } : it)));
      }

      if (turnProposals.length > 0) {
        // One combined assistant message carrying every tool call from this
        // turn, matching how the protocol actually shapes a multi-call turn
        // — the model can propose several actions at once and each gets its
        // own confirm card, resolved independently.
        setMessages([
          ...nextMessages,
          {
            role: "assistant",
            content: assistantText || null,
            tool_calls: turnProposals.map((p) => ({ id: p.toolCallId, type: "function", function: { name: p.tool, arguments: JSON.stringify(p.args) } })),
          },
        ]);
        setPendingProposals((prev) => [...prev, ...turnProposals]);
      } else if (assistantText) {
        setMessages([...nextMessages, { role: "assistant", content: assistantText }]);
      } else {
        setMessages(nextMessages);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // user hit stop — keep whatever streamed in so far, just end the turn
        setMessages(assistantText ? [...nextMessages, { role: "assistant", content: assistantText }] : nextMessages);
      } else {
        setError(e instanceof Error ? e.message : "Couldn't reach the assistant.");
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || busy || pendingProposals.length > 0) return;
    setDisplayItems((prev) => [...prev, { id: newId(), kind: "message", role: "user", content: text }]);
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setInput("");
    scrollToBottom();
    await streamChat(next);
  }

  async function handleConfirm(proposal: ActionProposal) {
    const password = proposal.needsPassword ? passwordDrafts[proposal.toolCallId] || "" : "";
    if (proposal.needsPassword && !password) {
      setPasswordErrors((prev) => ({ ...prev, [proposal.toolCallId]: "Enter your password to sign this action." }));
      return;
    }
    setPasswordErrors((prev) => ({ ...prev, [proposal.toolCallId]: "" }));
    setResolvingId(proposal.toolCallId);
    try {
      const res = await fetch("/api/assistant/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: proposal.tool, args: proposal.args, password: proposal.needsPassword ? password : undefined }),
      });
      const result = await res.json();
      updateProposal(proposal.toolCallId, result.ok ? "confirmed" : "error", result.ok ? result.message : result.error);

      const nextMessages: ChatMessage[] = [...messages, { role: "tool", tool_call_id: proposal.toolCallId, content: JSON.stringify(result) }];
      const remaining = pendingProposals.filter((p) => p.toolCallId !== proposal.toolCallId);
      setPendingProposals(remaining);
      setResolvingId(null);

      if (remaining.length === 0) {
        await streamChat(nextMessages);
      } else {
        setMessages(nextMessages);
      }
    } catch (e) {
      setResolvingId(null);
      setError(e instanceof Error ? e.message : "Couldn't complete that action.");
    }
  }

  async function handleCancel(proposal: ActionProposal) {
    updateProposal(proposal.toolCallId, "cancelled");
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "tool", tool_call_id: proposal.toolCallId, content: JSON.stringify({ cancelled: true, note: "The user declined this action." }) },
    ];
    const remaining = pendingProposals.filter((p) => p.toolCallId !== proposal.toolCallId);
    setPendingProposals(remaining);
    if (remaining.length === 0) {
      await streamChat(nextMessages);
    } else {
      setMessages(nextMessages);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openWidget}
        aria-label="Open assistant"
        className={`fixed right-5 z-40 w-14 h-14 rounded-full bg-primary shadow-[0_8px_24px_rgba(26,95,122,0.4)] flex items-center justify-center transition-transform hover:scale-105 active:scale-90 hover:bg-primary-dark bottom-[calc(96px+env(safe-area-inset-bottom)+14px)] md:bottom-6 ${everOpened ? "" : "assistant-fab-pulse"}`}
      >
        <AssistantIcon />
      </button>

      {panelRendered && (
        <div
          className={`fixed inset-0 z-50 flex items-end justify-center md:items-stretch md:justify-end p-0 md:p-6 bg-black/30 md:bg-transparent ${
            closing ? "modal-backdrop-out" : "modal-backdrop-in"
          }`}
          onClick={() => setOpen(false)}
          onAnimationEnd={() => {
            if (closing) setPanelRendered(false);
          }}
        >
          <div
            className={`${closing ? "menu-pop-out" : "menu-pop"} w-full md:w-[420px] h-[85vh] md:h-auto max-h-[85vh] md:max-h-none bg-white rounded-t-[20px] md:rounded-[20px] md:border md:border-border shadow-[0_12px_40px_rgba(16,42,58,0.25)] md:shadow-[0_20px_48px_rgba(16,42,58,0.22)] flex flex-col overflow-hidden`}
            style={{ transformOrigin: "bottom right" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 px-4 py-3.5 md:px-5 md:py-4 shrink-0 bg-white border-b border-border">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
                <AssistantIcon size={18} color="#1A5F7A" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] md:text-sm font-bold text-text">LIMS Assistant</span>
                  <span className="relative w-1.5 h-1.5 rounded-full bg-success shrink-0">
                    <span className="absolute inset-0 rounded-full bg-success animate-ping" />
                  </span>
                </div>
                <div className="text-[10px] md:text-[11px] text-muted truncate">Samples, stok, kalibrasi, analytics</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-chip-bg hover:text-text active:scale-90 transition-transform shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3.5 py-3 md:px-4 md:py-4 flex flex-col gap-2.5 bg-page-bg">
              {displayItems.length === 0 && (
                <div className="bubble-in-assistant flex items-start gap-2 self-start max-w-[88%]">
                  <div className="w-6 h-6 rounded-full bg-primary-soft flex items-center justify-center shrink-0 mt-0.5">
                    <AssistantIcon size={13} color="#1A5F7A" />
                  </div>
                  <div className="text-xs text-text bg-white shadow-card-sm rounded-[14px] rounded-bl-[4px] px-3.5 py-3">
                    Halo! Tanya apa saja soal sampel, stok reagen, jadwal kalibrasi, kinerja teknisi, atau minta ringkasan
                    analytics. Aksi seperti catat pemakaian reagen, approve, atau reject sampel akan selalu saya tunjukkan
                    dulu sebelum dijalankan.
                  </div>
                </div>
              )}

              {displayItems.map((item) => {
                if (item.kind === "message") {
                  if (!item.content) return null;
                  const isUser = item.role === "user";
                  if (isUser) {
                    return (
                      <div
                        key={item.id}
                        className="bubble-in-user text-[13px] leading-relaxed rounded-[14px] rounded-br-[4px] px-3.5 py-2.5 max-w-[88%] whitespace-pre-wrap self-end text-white bg-primary shadow-card-sm"
                      >
                        {item.content}
                      </div>
                    );
                  }
                  return (
                    <div key={item.id} className="bubble-in-assistant flex items-start gap-2 self-start max-w-[88%]">
                      <div className="w-6 h-6 rounded-full bg-primary-soft flex items-center justify-center shrink-0 mt-0.5">
                        <AssistantIcon size={13} color="#1A5F7A" />
                      </div>
                      <div className="text-[13px] leading-relaxed rounded-[14px] rounded-bl-[4px] px-3.5 py-2.5 bg-white text-text shadow-card-sm min-w-0">
                        <AssistantMarkdown content={item.content} />
                        {item.streaming && <span className="blink-cursor">▌</span>}
                      </div>
                    </div>
                  );
                }
                if (item.kind === "tool_result") {
                  return (
                    <div key={item.id} className="bubble-in-assistant self-start w-[92%] pl-8">
                      <ToolResultCard tool={item.tool} result={item.result} onNavigate={() => setOpen(false)} />
                    </div>
                  );
                }
                // proposal card. Keyed by status too so it re-mounts (and
                // replays its entrance animation) the moment it resolves —
                // a little re-pop that reads as "something just happened".
                const isActive = item.status === "pending";
                const passwordError = passwordErrors[item.proposal.toolCallId];
                const cardAnim = isActive ? "proposal-pending" : item.status === "error" ? "proposal-resolved-error" : "proposal-resolved";
                return (
                  <div
                    key={`${item.id}-${item.status}`}
                    className={`${cardAnim} self-start max-w-[92%] pl-8 w-[92%] bg-warning-bg border border-warning/30 rounded-[14px] rounded-bl-[4px] px-3.5 py-3 flex flex-col gap-2`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-warning-dark uppercase tracking-wide">
                      {item.status === "confirmed" && (
                        <span className="success-pop w-3.5 h-3.5 rounded-full bg-success flex items-center justify-center shrink-0">
                          <MiniCheckIcon />
                        </span>
                      )}
                      {isActive ? "Confirm action" : item.status === "confirmed" ? "Action completed" : item.status === "error" ? "Action failed" : "Cancelled"}
                    </div>
                    <div className="text-[13px] text-warning-dark">{item.proposal.description}</div>
                    {isActive ? (
                      <>
                        {item.proposal.needsPassword && (
                          <div className="flex flex-col gap-1">
                            <label className="text-[10.5px] font-semibold text-warning-dark" htmlFor={`pw-${item.proposal.toolCallId}`}>
                              Enter your password to sign this action
                            </label>
                            <input
                              id={`pw-${item.proposal.toolCallId}`}
                              type="password"
                              value={passwordDrafts[item.proposal.toolCallId] || ""}
                              onChange={(e) => setPasswordDrafts((prev) => ({ ...prev, [item.proposal.toolCallId]: e.target.value }))}
                              className={`${inputClassSm} border-warning/40`}
                            />
                            {passwordError && <div className="text-[10.5px] text-danger">{passwordError}</div>}
                          </div>
                        )}
                        <div className="flex gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => handleCancel(item.proposal)}
                            disabled={resolvingId !== null}
                            className="flex-1 text-xs font-semibold px-3 py-2 rounded-full border border-warning/40 text-warning-dark bg-white disabled:opacity-50 active:scale-95 transition-transform"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirm(item.proposal)}
                            disabled={resolvingId !== null}
                            className="flex-1 text-xs font-semibold px-3 py-2 rounded-full bg-warning-dark text-white disabled:opacity-50 active:scale-95 transition-transform"
                          >
                            {resolvingId === item.proposal.toolCallId ? "Working…" : "Confirm"}
                          </button>
                        </div>
                      </>
                    ) : (
                      item.note && (
                        <div className={`text-[11px] font-semibold ${item.status === "error" ? "text-danger" : "text-warning-dark/70"}`}>{item.note}</div>
                      )
                    )}
                  </div>
                );
              })}

              {busy && !pendingProposals.length && displayItems.at(-1)?.kind !== "message" && (
                <div className="bubble-in-assistant flex items-start gap-2 self-start">
                  <div className="avatar-think w-6 h-6 rounded-full bg-primary-soft flex items-center justify-center shrink-0 mt-0.5">
                    <AssistantIcon size={13} color="#1A5F7A" />
                  </div>
                  <div className="bg-white shadow-card-sm rounded-[14px] rounded-bl-[4px] px-3.5 py-3 flex items-center gap-1">
                    <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted" style={{ animationDelay: "0s" }} />
                    <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted" style={{ animationDelay: "0.15s" }} />
                    <span className="typing-dot w-1.5 h-1.5 rounded-full bg-muted" style={{ animationDelay: "0.3s" }} />
                  </div>
                </div>
              )}
              {error && <div className="shake-x self-start text-xs text-danger px-1">{error}</div>}
            </div>

            <div className="border-t border-border-soft p-2.5 md:p-3.5 shrink-0 bg-white">
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
                  disabled={busy || pendingProposals.length > 0}
                  className="flex-1 text-[13px] md:text-sm px-3.5 py-2.5 md:py-3 rounded-full border border-border bg-chip-bg focus:bg-white transition-colors text-text outline-none placeholder:text-faint disabled:opacity-60 min-w-0"
                />
                {busy ? (
                  <button
                    type="button"
                    onClick={stopStreaming}
                    aria-label="Stop"
                    className="w-10 h-10 rounded-full bg-danger text-white flex items-center justify-center shrink-0 active:scale-90 transition-transform"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={pendingProposals.length > 0 || !input.trim()}
                    aria-label="Send"
                    className="w-10 h-10 rounded-full bg-primary shadow-glow-primary text-white flex items-center justify-center shrink-0 disabled:opacity-40 disabled:shadow-none active:scale-90 transition-transform"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
