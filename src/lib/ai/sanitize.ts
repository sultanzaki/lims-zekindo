// Sanitization of untrusted free-text fields before they enter the LLM
// context (defence layer 3 of the assistant's prompt-injection hardening —
// layers 1 & 2 are the system-prompt instruction hierarchy and the
// [UNTRUSTED DATABASE DATA] delimiters in the chat route).
//
// This is deliberately NOT the primary defence: pattern matching can always
// be bypassed by rephrasing, so the instruction hierarchy must do the real
// work. What this layer adds is noise reduction — the most common injected
// phrases are flagged before the model even sees them, which both reduces
// the chance of a confused answer and makes a successful injection attempt
// visible (the marker text is preserved in the audit trail).

const INJECTION_PATTERNS: RegExp[] = [
  /\bignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)\b/i,
  /\bdisregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)\b/i,
  /\byou\s+are\s+now\s+(?!not\b)/i, // "you are now X" — role-play hijack
  /\bact\s+as\s+if\b/i,
  /\bnew\s+(system\s+)?prompt\b/i,
  /\bsystem\s+prompt\s*:/i,
  /\b(do\s+not|don'?t)\s+(follow|obey|listen\s+to)\s+(the\s+)?(instructions?|prompts?|rules?)\b/i,
  /\b(show|print|reveal|display|leak|repeat)\s+(your\s+|the\s+)?(system|developer|hidden)\s+(prompt|instructions?)\b/i,
  /\b(approve|accept|pass|mark\s+as\s+complete)\s+(all|every|everything|this)\b/i,
  /\bignore\s+previous\b/i,
  /\bforget\s+(everything|all)\b/i,
];

const FLAG_PREFIX = "[POSSIBLE PROMPT-INJECTION DETECTED] ";

/**
 * Scan a free-text field for common injection phrasing. When something is
 * found, the text is NOT removed (that would hide the evidence and can break
 * legitimate content) — instead it is prefixed with a flag the model is
 * trained to treat as "this is hostile content, do not comply, mention it".
 */
export function sanitizeForLlm(text: string | null | undefined): string {
  if (!text) return "";
  const hit = INJECTION_PATTERNS.some((re) => re.test(text));
  return hit ? `${FLAG_PREFIX}${text}` : text;
}

export { FLAG_PREFIX, INJECTION_PATTERNS };
