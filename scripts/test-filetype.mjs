// Standalone JS mirror of detectFileType — verifies detection rules.
const t = (bytes) => new Uint8Array(bytes);
const s = (str) => t(Array.from(str, (c) => c.charCodeAt(0)));

function ascii(buf, start, len) {
  let out = "";
  for (let i = start; i < start + len && i < buf.length; i++) {
    const c = buf[i];
    out += c >= 32 && c <= 126 ? String.fromCharCode(c) : ".";
  }
  return out;
}
function hasPrefix(buf, prefix) {
  if (buf.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) if (buf[i] !== prefix[i]) return false;
  return true;
}
function detectFileType(buf) {
  if (buf.length === 0) return { ok: false };
  if (hasPrefix(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { ok: true, mime: "application/pdf", kind: "document" };
  if (hasPrefix(buf, [0x89, 0x50, 0x4e, 0x47])) return { ok: true, mime: "image/png", kind: "image" };
  if (hasPrefix(buf, [0xff, 0xd8, 0xff])) return { ok: true, mime: "image/jpeg", kind: "image" };
  if (buf.length >= 12 && ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 4) === "WEBP") return { ok: true, mime: "image/webp", kind: "image" };
  if (hasPrefix(buf, [0x50, 0x4b, 0x03, 0x04])) return { ok: true, mime: "application/octet-stream", kind: "document" };
  const probe = buf.subarray(0, 1024);
  if (!probe.includes(0)) {
    let printable = 0, delimiters = 0;
    for (let i = 0; i < probe.length; i++) {
      const b = probe[i];
      if (b >= 9 || (b >= 32 && b <= 126)) printable++;
      if (b === 0x2c || b === 0x3b || b === 0x09) delimiters++;
    }
    if (probe.length > 0 && printable / probe.length > 0.85 && delimiters > 0) return { ok: true, mime: "text/csv", kind: "document" };
  }
  return { ok: false };
}

const cases = [
  ["PDF", t([0x25,0x50,0x44,0x46,0x2d,0x31,0x2e,0x34]), "application/pdf", "document"],
  ["PNG", t([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), "image/png", "image"],
  ["JPEG", t([0xff,0xd8,0xff,0xe0,0x00,0x10]), "image/jpeg", "image"],
  ["WebP", t([0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50]), "image/webp", "image"],
  ["ZIP/XLSX", t([0x50,0x4b,0x03,0x04,0x14,0x00]), "application/octet-stream", "document"],
  ["CSV", s("name,value,note\nA,1,x\nB,2,y"), "text/csv", "document"],
  ["HTML-spoof", s("<html><script>alert(1)</script></html>")],
  ["Empty", t([])],
  ["Random-binary", t([0x00,0x01,0x02,0xff,0xfe])],
  ["SVG-spoof-as-png", s("<svg xmlns='http://www.w3.org/2000/svg'>")],
];
let pass = 0, fail = 0;
for (const [name, b, m, k] of cases) {
  const r = detectFileType(b);
  const ok = (r.ok && r.mime === m && r.kind === k) || (!r.ok && m === undefined);
  console.log((ok ? "  PASS  " : "  FAIL  ") + name + " -> " + JSON.stringify(r));
  ok ? pass++ : fail++;
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
