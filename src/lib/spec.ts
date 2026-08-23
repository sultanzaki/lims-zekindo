export type SpecVerdict = "Pass" | "Fail" | null;

type SpecLimit =
  | { kind: "lte"; value: number }
  | { kind: "gte"; value: number }
  | { kind: "exact"; value: string };

/**
 * Reads the existing free-text spec label (e.g. "≤100 CFU/g", "Negative",
 * "No Growth") and pulls out a comparable limit, without needing any schema
 * change. Only handles the patterns actually used across the catalog today —
 * anything else (ranges, multi-clause specs) falls through to null, which
 * callers must treat as "no verdict available" rather than guessing.
 */
export function parseSpecLimit(spec: string): SpecLimit | null {
  const s = spec.trim();
  if (!s) return null;

  let m = s.match(/^[≤<]=?\s*([\d,]+\.?\d*)/);
  if (m) return { kind: "lte", value: parseFloat(m[1].replace(/,/g, "")) };

  m = s.match(/^[≥>]=?\s*([\d,]+\.?\d*)/);
  if (m) return { kind: "gte", value: parseFloat(m[1].replace(/,/g, "")) };

  // Non-numeric, non-generic text specs (e.g. "Negative", "No Growth") are
  // treated as an exact match. "Per SOP" is deliberately excluded — it's a
  // placeholder meaning "no fixed spec", not a literal expected value.
  if (!/\d/.test(s) && s.toLowerCase() !== "per sop") {
    return { kind: "exact", value: s };
  }

  return null;
}

export function parseSpecVerdict(spec: string | null | undefined, result: string | null | undefined): SpecVerdict {
  if (!spec || !result) return null;
  const limit = parseSpecLimit(spec);
  if (!limit) return null;

  if (limit.kind === "exact") {
    return result.trim().toLowerCase() === limit.value.trim().toLowerCase() ? "Pass" : "Fail";
  }

  const n = parseFloat(String(result).replace(/[^0-9.\-]/g, ""));
  if (Number.isNaN(n)) return null;
  if (limit.kind === "lte") return n <= limit.value ? "Pass" : "Fail";
  return n >= limit.value ? "Pass" : "Fail";
}

/** Numeric limit to compare a result against on a progress bar, when one exists. */
export function specNumericLimit(spec: string | null | undefined): number | null {
  if (!spec) return null;
  const limit = parseSpecLimit(spec);
  return limit && limit.kind !== "exact" ? limit.value : null;
}
