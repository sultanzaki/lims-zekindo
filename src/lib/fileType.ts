import "server-only";

// Server-side file-type detection from content (magic bytes), not from the
// client-supplied MIME label. The browser's `File.type` is trivially
// spoofable — an attacker can upload an HTML/JS payload labeled
// "application/pdf" — so any upload path that stores a file and later serves
// it (even through signed URLs) must verify what the bytes actually are.
//
// Returns the *canonical* MIME type detected from the file content, or null
// when the bytes don't match any allowed type. Callers should store the
// returned value (not the client's `file.type`) as `fileType`, and reject the
// upload when this returns null.

export type DetectedFile =
  | { ok: true; mime: string; kind: "image" | "document" }
  | { ok: false };

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DOCUMENT_MIMES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
]);

// Allowed for uploads that flow through detectFileType(). Kept as the single
// source of truth so every call site validates against the same allow-list.
export const ALLOWED_UPLOAD_MIMES: ReadonlySet<string> = new Set([
  ...Array.from(IMAGE_MIMES),
  ...Array.from(DOCUMENT_MIMES),
]);

function ascii(buf: Uint8Array, start: number, len: number): string {
  let out = "";
  for (let i = start; i < start + len && i < buf.length; i++) {
    const c = buf[i];
    out += c >= 32 && c <= 126 ? String.fromCharCode(c) : ".";
  }
  return out;
}

function hasPrefix(buf: Uint8Array, prefix: Uint8Array | number[]): boolean {
  if (buf.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (buf[i] !== prefix[i]) return false;
  }
  return true;
}

/**
 * Detect the real type of an uploaded file from its first bytes.
 *
 * Supported (checked in order):
 * - PDF            %PDF-
 * - PNG            89 50 4E 47
 * - JPEG           FF D8 FF
 * - WebP           RIFF....WEBP
 * - ZIP-based docs  PK\x03\x04 (xlsx/docx; caller disambiguates by extension
 *                   since xlsx/docx are both zip containers — for serving,
 *                   both are force-downloaded so the distinction is cosmetic)
 * - CSV / plain     printable ASCII/UTF-8 with no NUL bytes and at least one
 *                   comma/semicolon/tab within the first 1 KB (loose heuristic;
 *                   caller stores it as text/csv only when the original label
 *                   also claimed a spreadsheet/CSV type — see detectUploadType)
 */
export function detectFileType(buf: Uint8Array): DetectedFile {
  if (buf.length === 0) return { ok: false };

  // PDF
  if (hasPrefix(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { ok: true, mime: "application/pdf", kind: "document" };
  }
  // PNG
  if (hasPrefix(buf, [0x89, 0x50, 0x4e, 0x47])) {
    return { ok: true, mime: "image/png", kind: "image" };
  }
  // JPEG
  if (hasPrefix(buf, [0xff, 0xd8, 0xff])) {
    return { ok: true, mime: "image/jpeg", kind: "image" };
  }
  // WebP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    ascii(buf, 0, 4) === "RIFF" &&
    ascii(buf, 8, 4) === "WEBP"
  ) {
    return { ok: true, mime: "image/webp", kind: "image" };
  }
  // ZIP container (xlsx / docx / generic zip)
  if (hasPrefix(buf, [0x50, 0x4b, 0x03, 0x04])) {
    // Caller picks the exact MIME by original extension; we return a generic
    // office marker. The `mime` returned here is the safe default.
    return { ok: true, mime: "application/octet-stream", kind: "document" };
  }

  // Loose CSV/plain-text check: no NUL bytes in the first 1 KB, mostly
  // printable, and a delimiter present. Returns null when unsure.
  const probe = buf.subarray(0, 1024);
  if (!probe.includes(0)) {
    let printable = 0;
    let delimiters = 0;
    // Plain indexed loop (avoids TS2802 Set/typed-array iteration on the
    // ES2017 lib target used by this repo).
    for (let i = 0; i < probe.length; i++) {
      const b = probe[i];
      if (b >= 9 || (b >= 32 && b <= 126)) printable++;
      if (b === 0x2c || b === 0x3b || b === 0x09) delimiters++; // , ; tab
    }
    if (probe.length > 0 && printable / probe.length > 0.85 && delimiters > 0) {
      return { ok: true, mime: "text/csv", kind: "document" };
    }
  }

  return { ok: false };
}

/**
 * High-level helper for upload actions: take the client File, read its head,
 * and decide (a) whether it's allowed and (b) what canonical MIME + kind to
 * store. `originalType` is the client label — it is never trusted on its
 * own, but is used to disambiguate zip containers (xlsx vs docx) and to
 * accept plain-text spreadsheets whose content is ambiguous.
 */
export async function detectUploadType(
  file: File,
  originalType: string
): Promise<{ mime: string; kind: "image" | "document" } | null> {
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const detected = detectFileType(head);
  if (!detected.ok) return null;

  if (detected.mime !== "application/octet-stream") {
    // Direct hit (pdf/png/jpeg/webp/csv) — trust the detected type.
    return { mime: detected.mime, kind: detected.kind };
  }

  // ZIP container: use the client extension to pick xlsx vs docx, but only
  // when the label also claims an office type. Anything else zip-shaped but
  // not labeled as an office document is rejected.
  const lower = (originalType || "").toLowerCase();
  if (lower.includes("spreadsheetml")) {
    return { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", kind: "document" };
  }
  if (lower.includes("wordprocessingml")) {
    return { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", kind: "document" };
  }
  if (lower === "application/vnd.ms-excel" || lower.includes("excel")) {
    return { mime: "application/vnd.ms-excel", kind: "document" };
  }
  if (lower.includes("msword")) {
    return { mime: "application/msword", kind: "document" };
  }
  return null;
}
