// Shared logic for the "Warehouse" (plant chemical stock) snapshot feature —
// parsing the Odoo/Looker Studio "Stock Ending" CSV/Excel export into
// normalized rows, plus display helpers for the list page.
//
// The source export is a flat table with these columns (header row may vary
// slightly between exports, so column matching is fuzzy/normalized):
//   Location | Product Reference | Product Name | Lot Number |
//   Vendor Lot Number | Vendor Packaging | Unit | Qty
//
// Data is stored exactly as exported (text fields trimmed, quantities as
// numbers). There is no expiry-date concept in the source data and no
// min-stock concept, so the lab-style In stock/Low stock/Expired badges do
// not apply — status here is derived from quantity only (Zero stock vs
// available).

export type WarehouseStockRow = {
  location: string;
  productRef: string;
  productName: string;
  lotNumber: string;
  vendorLotNumber: string;
  vendorPackaging: string;
  unit: string;
  quantity: number;
};

// Column aliases accepted when mapping an arbitrary export header row to the
// canonical field. Matching is case-insensitive after trimming; a header can
// map to at most one field, first match wins per field.
//
// IMPORTANT: FIELD_ORDER is the precedence order and must list more-specific
// fields BEFORE their more-generic supersets. "Vendor Lot Number" must match
// vendorLotNumber, not lotNumber, so vendor-lot aliases are checked first.
const COLUMN_ALIASES: Record<keyof WarehouseStockRow, string[]> = {
  location: ["location", "lokasi", "warehouse", "gudang", "storage"],
  productRef: ["product reference", "product ref", "productref", "reference", "ref", "kode barang", "kode", "item code", "product code", "sku"],
  productName: ["product name", "productname", "product", "name", "nama barang", "nama produk", "material", "item", "description", "deskripsi", "bahan"],
  lotNumber: ["lot number", "lot no", "lot", "batch number", "batch no", "batch", "no lot", "no batch"],
  vendorLotNumber: ["vendor lot number", "vendor lot no", "vendor lot", "supplier lot", "vendor batch", "supplier batch"],
  vendorPackaging: ["vendor packaging", "packaging", "kemasan", "package", "pack"],
  unit: ["unit", "uom", "satuan"],
  quantity: ["qty", "quantity", "qty on hand", "stock", "stok", "jumlah", "on hand", "balance", "ending"],
};

// Precedence order — most specific first (see note above).
const FIELD_ORDER: (keyof WarehouseStockRow)[] = [
  "vendorLotNumber",
  "vendorPackaging",
  "productRef",
  "productName",
  "lotNumber",
  "location",
  "quantity",
  "unit",
];

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    // Normalize common punctuation/whitespace variants ("Lot No." vs "Lot No")
    .replace(/[._/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapHeaderToField(header: string): keyof WarehouseStockRow | null {
  const norm = normalizeHeader(header);
  for (const field of FIELD_ORDER) {
    const aliases = COLUMN_ALIASES[field];
    // Exact alias match (after normalization) OR substring containment for
    // headers like "Product Reference No." or "Qty (L)".
    if (aliases.some((a) => normalizeHeader(a) === norm || norm.includes(normalizeHeader(a)))) return field;
  }
  return null;
}

function parseNumber(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const s = String(raw).trim();
  if (!s) return 0;
  // Handle "24,000.5" (US) and "24.000,5" (EU) plus bare values; Excel
  // sometimes emits numbers as text with a thousands separator.
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // Whichever separator appears LAST is the decimal separator.
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    const cleaned = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  if (hasComma) {
    // Single separator: could be decimal ("24,5") or thousands ("24,000").
    // The stock-ending export uses dot as thousands and comma never appears
    // as a thousands sep in the same column; if there are exactly 3 digits
    // after the comma it is almost certainly thousands.
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

export function parseQuantity(raw: unknown): number {
  return parseNumber(raw);
}

export function cellText(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  const s = String(raw).trim();
  // Excel date cells export as JS Date strings in CSV dumps — the vendor lot
  // column sometimes contains values like "Mon May 18 2026 00:00:00 GMT+0700
  // (Western Indonesia Time)". Preserve the text; do not try to interpret it.
  return s;
}

export function normalizeRow(raw: Record<string, unknown>, headerMap: Map<number, keyof WarehouseStockRow>): WarehouseStockRow {
  const get = (field: keyof WarehouseStockRow): unknown => {
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

// ---- CSV parsing (no external dep; handles quoted fields, embedded commas,
// CRLF, and a BOM). ----
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
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
      // Handle CRLF and lone CR.
      if (src[i + 1] === "\n") i += 1;
      pushRow();
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field !== "" || row.length > 0) pushRow();
  // Drop trailing fully-empty rows (common after a final newline).
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c.trim() === "")) rows.pop();
  return rows;
}

export function parseCsvToRows(text: string): { rows: WarehouseStockRow[]; headers: string[]; skippedHeaderOnly: boolean } {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], headers: [], skippedHeaderOnly: true };
  const headerRow = table[0];
  const headerMap = new Map<number, keyof WarehouseStockRow>();
  headerRow.forEach((h, idx) => {
    const f = mapHeaderToField(h);
    if (f && ![...headerMap.values()].includes(f)) headerMap.set(idx, f);
  });

  const rawHeaderText = headerRow.map((h) => h.trim()).filter(Boolean).join(" | ");
  const rows: WarehouseStockRow[] = [];
  for (let r = 1; r < table.length; r++) {
    const raw = table[r];
    const obj: Record<string, unknown> = {};
    raw.forEach((v, idx) => {
      obj[idx] = v;
    });
    const norm = normalizeRow(obj, headerMap);
    if (!norm.productName && !norm.lotNumber && !norm.location && norm.quantity === 0) continue; // blank line
    rows.push(norm);
  }
  return { rows, headers: rawHeaderText ? [rawHeaderText] : [], skippedHeaderOnly: rows.length === 0 };
}

export type ParseOutcome =
  | { ok: true; rows: WarehouseStockRow[]; matchedFields: string[]; missingRequired: string[] }
  | { ok: false; error: string };

export function validateParsedRows(rows: WarehouseStockRow[], matchedFields: string[]): ParseOutcome {
  const missingRequired = ["location", "productName", "lotNumber", "quantity"].filter((f) => !matchedFields.includes(f));
  if (missingRequired.length > 0) {
    return {
      ok: false,
      error: `Could not find required column(s): ${missingRequired.join(", ")}. Expected headers like Location | Product Reference | Product Name | Lot Number | Vendor Lot Number | Vendor Packaging | Unit | Qty`,
    };
  }
  if (rows.length === 0) {
    return { ok: false, error: "No data rows found in the file." };
  }
  return { ok: true, rows, matchedFields, missingRequired };
}
