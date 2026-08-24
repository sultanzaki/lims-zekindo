import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

// Excludes visually ambiguous characters (0/O, 1/I/L) since this code is meant
// to be read off a printed label or relayed by phone.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// A random per-sample code (distinct from the sequential, guessable Sample ID)
// that gates access to the public tracking portal — knowing the Sample ID
// alone must never be enough to see another party's testing data.
export function generateAccessCode(length = 8): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function formatAccessCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

export function normalizeAccessCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeSampleId(raw: string): string {
  return raw.trim().toUpperCase();
}

// Constant-shape comparison isn't the concern here (this isn't a password) —
// the point is simply that a valid Sample ID alone must never be sufficient;
// the random accessCode is the actual gate on the public tracking portal.
export async function verifyTrackingAccess(rawId: string, rawCode: string): Promise<string | null> {
  const id = normalizeSampleId(rawId);
  const code = normalizeAccessCode(rawCode);
  if (!id || !code) return null;

  const sample = await prisma.sample.findUnique({ where: { id }, select: { id: true, accessCode: true } });
  if (!sample?.accessCode || sample.accessCode !== code) return null;
  return sample.id;
}
