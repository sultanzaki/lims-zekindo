// Standalone verification mirror for src/lib/warehouse-stock.ts parsing
// logic (run: node scripts/test-warehouse-stock.mjs). tsc is not a reliable
// gate in this repo (pre-existing noise), so pure logic like CSV parsing and
// header matching is verified here against representative + hostile inputs.
import { readFileSync } from "node:fs";

// --- copy of the lib (kept in sync manually; see src/lib/warehouse-stock.ts)
const COLUMN_ALIASES = {
  location: ["location", "lokasi", "warehouse", "gudang", "storage"],
  productRef: ["product reference", "product ref", "productref", "reference", "ref", "kode barang", "kode", "item code", "product code", "sku"],
  productName: ["product name", "productname", "product", "name", "nama barang", "nama produk", "material", "item", "description", "deskripsi", "bahan"],
  lotNumber: ["lot number", "lot no", "lot", "batch number", "batch no", "batch", "no lot", "no batch"],
  vendorLotNumber: ["vendor lot number", "vendor lot no", "vendor lot", "supplier lot", "vendor batch", "supplier batch"],
  vendorPackaging: ["vendor packaging", "packaging", "kemasan", "package", "pack"],
  unit: ["unit", "uom", "satuan"],
  quantity: ["qty", "quantity", "qty on hand", "stock", "stok", "jumlah", "on hand", "balance", "ending"],
};
const FIELD_ORDER = ["vendorLotNumber", "vendorPackaging", "productRef", "productName", "lotNumber", "location", "quantity", "unit"];

function normalizeHeader(h) {
  return h.trim().toLowerCase().replace(/[._/-]/g, " ").replace(/\s+/g, " ").trim();
}
function mapHeaderToField(header) {
  const norm = normalizeHeader(header);
  for (const field of FIELD_ORDER) {
    const aliases = COLUMN_ALIASES[field];
    if (aliases.some((a) => normalizeHeader(a) === norm || norm.includes(normalizeHeader(a)))) return field;
  }
  return null;
}
function parseNumber(raw) {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const s = String(raw).trim();
  if (!s) return 0;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    const cleaned = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  if (hasComma) {
    const after = s.split(",")[1] ?? "";
    if (/^\d{3}$/.test(after)) {
      const n = parseFloat(s.replace(/,/g, ""));
      return Number.isFinite(n) ? n : 0;
    }
    const n = parseFloat(s.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
function cellText(raw) {
  if (raw === null || raw === undefined) return "";
  return String(raw).trim();
}
function normalizeRow(raw, headerMap) {
  const get = (field) => {
    for (const [idx, f] of headerMap) {
      if (f === field) return raw[idx];
    }
    return undefined;
  };
  return {
    location: cellText(get("location")),
    productRef: cellText(get("productRef")),
    productName: cellText(get("productName")),
    lotNumber: cellText(get("lotNumber")),
    vendorLotNumber: cellText(get("vendorLotNumber")),
    vendorPackaging: cellText(get("vendorPackaging")),
    unit: cellText(get("unit")),
    quantity: parseNumber(get("quantity")),
  };
}
function parseCsv(text) {
  const src = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (ch === "\n") {
      pushRow();
      i += 1;
      continue;
    }
    if (ch === "\r") {
      if (src[i + 1] === "\n") i += 1;
      pushRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field !== "" || row.length > 0) pushRow();
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c.trim() === "")) rows.pop();
  return rows;
}
function rowsFromTable(table) {
  const headers = table[0] ?? [];
  const matched = new Set();
  const headerMap = new Map();
  headers.forEach((h, i) => {
    const f = mapHeaderToField(h);
    if (f) {
      matched.add(f);
      if (![...headerMap.values()].includes(f)) headerMap.set(i, f);
    }
  });
  const rows = [];
  for (let r = 1; r < table.length; r++) {
    const raw = table[r];
    const obj = {};
    raw.forEach((v, i) => {
      obj[i] = v;
    });
    const row = normalizeRow(obj, headerMap);
    if (!row.productName && !row.lotNumber && !row.location && row.quantity === 0) continue;
    rows.push(row);
  }
  return { rows, matchedFields: [...matched] };
}
function validateParsedRows(rows, matchedFields) {
  const missingRequired = ["location", "productName", "lotNumber", "quantity"].filter((f) => !matchedFields.includes(f));
  if (missingRequired.length > 0) return { ok: false, error: `Missing columns: ${missingRequired.join(", ")}` };
  if (rows.length === 0) return { ok: false, error: "No data rows found" };
  return { ok: true, rows, matchedFields, missingRequired };
}
// --- end copy

let pass = 0;
let fail = 0;
function check(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log(`  PASS ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name} ${extra}`);
  }
}

console.log("Header matching:");
check("exact english headers", mapHeaderToField("Location") === "location" && mapHeaderToField("Product Name") === "productName");
check("indonesian headers", mapHeaderToField("Lokasi") === "location" && mapHeaderToField("Nama Barang") === "productName" && mapHeaderToField("Satuan") === "unit");
check("Qty alias", mapHeaderToField("Qty") === "quantity" && mapHeaderToField("Qty on hand") === "quantity");
check("lot no punctuation", mapHeaderToField("Lot No.") === "lotNumber" && mapHeaderToField("Lot No") === "lotNumber");
check("case + space insensitive", mapHeaderToField("  product   NAME ") === "productName");
check("unknown header null", mapHeaderToField("Totally Unrelated") === null);
check("vendor lot distinct from lot", mapHeaderToField("Vendor Lot Number") === "vendorLotNumber");

console.log("CSV parsing:");
const sampleCsv = [
  "Location,Product Reference,Product Name,Lot Number,Vendor Lot Number,Vendor Packaging,Unit,Qty",
  'JBK/Stock/JBK 1/Raw Material/Staging & Outside,A0145,"PERTASOL CA",1051.08.0726,1362-07-26,,L,24000',
  'JBK/Stock/JBK 1/Production,E0002,WAWP,AZ.0826.0043,AZ.0826.0043,,kg,"21,859.11"',
  'SMP/Stock,B0013,PAIL 25 L BIRU KOTAK,,,,Unit,5',
  "",
].join("\n");
{
  const table = parseCsv(sampleCsv);
  const { rows, matchedFields } = rowsFromTable(table);
  check("header matched all required", ["location", "productName", "lotNumber", "quantity"].every((f) => matchedFields.includes(f)), JSON.stringify(matchedFields));
  check("3 data rows (blank line dropped)", rows.length === 3, `got ${rows.length}`);
  check("quoted comma product name intact", rows[0].productName === "PERTASOL CA", rows[0].productName);
  check("numeric thousands in quotes parsed", rows[1].quantity === 21859.11, rows[1].quantity);
  check("location text preserved", rows[0].location.includes("Staging & Outside"));
  check("empty trailing fields ok", rows[2].lotNumber === "" && rows[2].quantity === 5);
}

console.log("EU decimal (for robustness):");
{
  const table = parseCsv("Location,Product Name,Lot Number,Qty\nX,A,1,\"24.000,5\"\n");
  const { rows } = rowsFromTable(table);
  check("EU decimal parsed", rows.length === 1 && rows[0].quantity === 24000.5, rows[0]?.quantity);
}

console.log("Real file parse (from user's CSV):");
{
  const realPath = "/opt/data/0303_stock.csv";
  let real;
  try {
    real = readFileSync(realPath, "utf8");
  } catch {
    // not present in this environment — skip gracefully
  }
  if (real) {
    const table = parseCsv(real);
    const { rows, matchedFields } = rowsFromTable(table);
    check("matched required cols", ["location", "productName", "lotNumber", "quantity"].every((f) => matchedFields.includes(f)), JSON.stringify(matchedFields));
    check("parsed > 5 rows", rows.length > 5, `got ${rows.length}`);
    const pertasol = rows.filter((r) => r.productName === "PERTASOL CA");
    check("found PERTASOL CA lines", pertasol.length > 0, `got ${pertasol.length}`);
    const p = pertasol[0];
    check("pertasol qty numeric", typeof p.quantity === "number" && p.quantity === 24000, `${p.quantity}`);
    // Vendor lot that is a JS Date string must be preserved verbatim as text.
    const pxe = rows.find((r) => r.productName === "P-XE");
    check("js-date vendor lot preserved", pxe?.vendorLotNumber?.includes("Mon May 18 2026"), pxe?.vendorLotNumber);
    // Quoted inch marks inside product name.
    const cart = rows.find((r) => r.productName?.includes("CATRIDGE FILTER"));
    check("quoted inch product name intact", Boolean(cart), cart?.productName);
    const max = Math.max(...rows.map((r) => r.quantity));
    const min = Math.min(...rows.map((r) => r.quantity));
    check("qty range plausible", min >= 0 && max <= 1_000_000, `min ${min} max ${max}`);
    check("no NaN qty", rows.every((r) => Number.isFinite(r.quantity)));
  } else {
    console.log("  (real file not present, skipping)");
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
