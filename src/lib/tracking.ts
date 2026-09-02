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

// A Business Unit portal token unlocks every sample belonging to that BU at
// once (not just one), so it carries a bigger blast radius than a single
// sample's accessCode — meaningfully longer for that reason.
export function generatePortalToken(): string {
  return generateAccessCode(16);
}

export function normalizeAccessCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeSampleId(raw: string): string {
  return raw.trim().toUpperCase();
}

// The URL embedded in a Certificate of Analysis's QR code — scanning it
// opens the public, no-login certificate reprint so the holder can compare
// it against the printed page. The accessCode is what makes this a genuine
// authenticity check rather than a guessable-by-sample-ID lookup.
export function certificateVerificationUrl(origin: string, sampleId: string, accessCode: string): string {
  return `${origin}/track/certificate?id=${sampleId}&code=${accessCode}`;
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

// Business Unit client portal: the token alone is the whole lookup key (no
// separate ID to pair it with, unlike sample tracking) — a BU only becomes
// reachable this way once staff has explicitly generated a portalToken for
// it, so a bare `findUnique` naturally returns null for every BU that never
// opted in.
export async function verifyPortalAccess(rawToken: string): Promise<{ id: string; name: string } | null> {
  const token = normalizeAccessCode(rawToken);
  if (!token) return null;
  const bu = await prisma.businessUnit.findUnique({ where: { portalToken: token }, select: { id: true, name: true } });
  return bu;
}
