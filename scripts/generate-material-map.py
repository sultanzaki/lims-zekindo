#!/usr/bin/env python3
"""Regenerate src/lib/warehouse-material-map.ts from a kamus pairs JSON.

Usage:
  python scripts/generate-material-map.py <kamus_pairs.json>

The kamus JSON is a list of [display_name, odoo_code] pairs extracted from the
plant's "kamus rm" PDF (columns: Prod Name Intacs | Prod Name Odoo). The map
direction that matters for the Stock Ending CSV is odoo_code -> display name.
"""
import json
import re
import sys
from pathlib import Path

def main() -> None:
    src = sys.argv[1] if len(sys.argv) > 1 else "kamus_pairs_clean.json"
    with open(src) as f:
        pairs = json.load(f)

    def norm_code(s: str) -> str:
        return re.sub(r"\s+", " ", s).strip().upper()

    def norm_name(s: str) -> str:
        return re.sub(r"\s+", " ", s).strip()

    seen = {}
    for name, code in pairs:
        key = norm_code(code)
        nm = norm_name(name)
        if key and nm and key not in seen:
            seen[key] = nm

    entries = sorted(seen.items(), key=lambda kv: kv[0])
    lines = []
    for code, name in entries:
        c = code.replace("\\", "\\\\").replace('"', '\\"')
        n = name.replace("\\", "\\\\").replace('"', '\\"')
        lines.append(f'  "{c}": "{n}",')
    body = "\n".join(lines)

    ts = f'''// AUTO-GENERATED from the plant's "kamus rm" reference (Intacs display name
// <-> Odoo short code) for raw materials. Regenerate with
// scripts/generate-material-map.py when the kamus changes.
//
// Direction: Odoo code (the value appearing in the Stock Ending CSV's
// Product Name column for raw materials, e.g. "2NED") -> human-readable
// material name (e.g. "NA2.EDTA"). Names that are already descriptive
// (finished goods, packaging) are not keys here and pass through unchanged.

export const WAREHOUSE_MATERIAL_NAMES: Record<string, string> = {{
{body}
}};

// Normalize a product-name string for lookup: collapse whitespace, trim,
// uppercase. This makes "POW  31" (double space in the kamus) match "POW 31"
// as it appears in the stock export.
export function normalizeMaterialKey(s: string): string {{
  return s.replace(/\\s+/g, " ").trim().toUpperCase();
}}

// Resolve a raw Odoo code to its human-readable material name. Falls back to
// the original string when there is no mapping (finished goods, packaging,
// unknown codes).
export function resolveMaterialName(productName: string): string {{
  const key = normalizeMaterialKey(productName);
  return WAREHOUSE_MATERIAL_NAMES[key] ?? productName;
}}
'''
    out = Path(__file__).resolve().parent.parent / "src" / "lib" / "warehouse-material-map.ts"
    out.write_text(ts)
    print(f"wrote {len(entries)} entries -> {out}")

if __name__ == "__main__":
    main()
