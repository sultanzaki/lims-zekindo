// Standalone mirror of toUserMessage from src/lib/userFacingError.ts —
// verifies raw error text maps to friendly user messages, never leaks.
const KNOWN_FRIENDLY = [
  { test: /no longer awaiting (supervisor review|qa approval)/i, message: "This sample has already been reviewed by someone else. Refresh the page to see its current status." },
  { test: /unique constraint|duplicate|already exists/i, message: "A record with these details already exists. Check for duplicates and try again." },
  { test: /foreign key|doesn't exist|not found/i, message: "The item you're trying to update no longer exists. It may have been removed. Refresh and try again." },
  { test: /too large|exceeds .* limit/i, message: "That file is too large. Try a smaller file." },
  { test: /unsupported file type|invalid file type/i, message: "That file type isn't supported. Use a PDF, image, or Excel/CSV file." },
  { test: /signature|password.*incorrect|incorrect password/i, message: "The password you entered doesn't match your account. Try again." },
  { test: /rate limit|too many requests/i, message: "Too many attempts — please wait a moment and try again." },
];

function toUserMessage(err) {
  if (err instanceof Error) {
    const raw = err.message;
    for (const k of KNOWN_FRIENDLY) {
      if (k.test.test(raw)) return k.message;
    }
  }
  return "Something went wrong. Please try again — if it keeps happening, contact your system administrator.";
}

let pass = 0, fail = 0;
function check(name, got, want) {
  if (got === want) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}\n  got:  ${got}\n  want: ${want}`); }
}

// Known patterns → friendly message (no raw leak)
check("stale review race", toUserMessage(new Error("Sample no longer awaiting supervisor review")), "This sample has already been reviewed by someone else. Refresh the page to see its current status.");
check("prisma unique leak", toUserMessage(new Error("Unique constraint failed on the fields: (`name`)")), "A record with these details already exists. Check for duplicates and try again.");
check("file too large", toUserMessage(new Error("File is too large (max 10MB).")), "That file is too large. Try a smaller file.");
check("bad file type", toUserMessage(new Error("Unsupported file type. Use a PDF, image (JPG/PNG/WebP), or Excel/CSV file.")), "That file type isn't supported. Use a PDF, image, or Excel/CSV file.");

// Unknown / technical errors → calm fallback, no internals shown
const raw = new Error("PrismaClientKnownRequestError: Invalid `prisma.sample.findMany()` invocation in /app/src/lib/data.ts:123\nColumn 'x' does not exist. Connection string: postgresql://...");
check("unknown prisma", toUserMessage(raw), "Something went wrong. Please try again — if it keeps happening, contact your system administrator.");
check("plain unknown", toUserMessage(new Error("ECONNRESET")), "Something went wrong. Please try again — if it keeps happening, contact your system administrator.");
check("non-error", toUserMessage("string err"), "Something went wrong. Please try again — if it keeps happening, contact your system administrator.");
check("undefined", toUserMessage(undefined), "Something went wrong. Please try again — if it keeps happening, contact your system administrator.");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
