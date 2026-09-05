// Quick sanity test of the magic-byte detection logic (mirrors detectFileType
// in src/lib/fileType.ts, run standalone so it doesn't need the Next build).
import { detectFileType } from "../src/lib/fileType.ts";

function buf(...bytes) {
  return new Uint8Array(bytes);
}

const cases = [
  ["PDF", buf(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34), "application/pdf", "document"],
  ["PNG", buf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "image/png", "image"],
  ["JPEG", buf(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10), "image/jpeg", "image"],
  ["WebP", buf(0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50), "image/webp", "image"],
  ["ZIP/XLSX", buf(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00), "application/octet-stream", "document"],
  ["CSV", buf(...Array.from("name,value,note\nA,1,x\nB,2,y\n", (c) => c.charCodeAt(0))), "text/csv", "document"],
  ["HTML (spoof)", buf(...Array.from("<html><script>alert(1)</script></html>", (c) => c.charCodeAt(0))), null, null],
  ["Empty", buf(), null, null],
  ["Random binary", buf(0x00, 0x01, 0x02, 0xff, 0xfe), null, null],
];

let pass = 0;
let fail = 0;
for (const [name, b, expectMime, expectKind] of cases) {
  const r = detectFileType(b);
  const ok = r.ok && r.mime === expectMime && r.kind === expectKind || (!r.ok && expectMime === null);
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}: got ${JSON.stringify(r)}, expected mime=${expectMime} kind=${expectKind}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
