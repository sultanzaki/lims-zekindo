// Turns an unknown thrown value into a message that is safe and helpful to
// show a lab user — never raw exception text (Prisma errors embed query
// internals, SQL fragments, or connection strings) and never the generic
// English of a library. Unknown/unexpected errors become a calm fallback
// phrase; the original error is still logged separately for diagnostics.

const KNOWN_FRIENDLY: { test: RegExp; message: string }[] = [
  {
    test: /no longer awaiting (supervisor review|qa approval)/i,
    message: "This sample has already been reviewed by someone else. Refresh the page to see its current status.",
  },
  {
    test: /unique constraint|duplicate|already exists/i,
    message: "A record with these details already exists. Check for duplicates and try again.",
  },
  {
    test: /foreign key|doesn't exist|not found/i,
    message: "The item you're trying to update no longer exists. It may have been removed. Refresh and try again.",
  },
  {
    test: /too large|exceeds .* limit/i,
    message: "That file is too large. Try a smaller file.",
  },
  {
    test: /unsupported file type|invalid file type/i,
    message: "That file type isn't supported. Use a PDF, image, or Excel/CSV file.",
  },
  {
    test: /signature|password.*incorrect|incorrect password/i,
    message: "The password you entered doesn't match your account. Try again.",
  },
  {
    test: /rate limit|too many requests/i,
    message: "Too many attempts — please wait a moment and try again.",
  },
];

export function toUserMessage(err: unknown): string {
  if (err instanceof Error) {
    const raw = err.message;
    for (const k of KNOWN_FRIENDLY) {
      if (k.test.test(raw)) return k.message;
    }
  }
  return "Something went wrong. Please try again — if it keeps happening, contact your system administrator.";
}

/** Logs the technical detail but returns a safe user message. */
export function handleActionError(err: unknown): { error: string } {
  console.error("[action error]", err);
  return { error: toUserMessage(err) };
}

/** Maps a thrown value to a stable audit-friendly label (no secrets). */
export function errorKind(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.includes("no longer awaiting")) return "stale_status";
    if (/unique constraint/i.test(err.message)) return "duplicate";
    if (/foreign key/i.test(err.message)) return "missing_reference";
    if (/too large/i.test(err.message)) return "file_too_large";
  }
  return "unexpected";
}
