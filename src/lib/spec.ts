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

// ---------------------------------------------------------------------------
// Structured result types (NUMERIC / CATEGORICAL / TEXT)
//
// The engine above stays untouched and keeps handling every row created
// before this existed (resultType === null): it infers Pass/Fail by
// regex-parsing the free-text `spec` string. Everything below is a second,
// independent path that only activates once `resultType` is explicitly set
// on a Test/TestCatalog row — it reads structured fields instead of
// re-guessing them from text, so it can express things the regex parser
// never could (two-sided ranges, a target ± tolerance, an ordered
// semi-quantitative scale, multiple acceptable categorical values, or a
// purely descriptive field with no verdict at all).

export type ResultType = "NUMERIC" | "CATEGORICAL" | "TEXT";
export type NumericMode = "lte" | "gte" | "range" | "target" | "info";

/** The structured fields shared by the Test and TestCatalog Prisma models. */
export interface ResultTypeConfig {
  resultType: string | null;
  numericMode: string | null;
  numericLimit: number | null;
  numericMin: number | null;
  numericMax: number | null;
  numericTarget: number | null;
  numericTolerance: number | null;
  categoricalOptions: string | null;
  categoricalPassOptions: string | null;
  categoricalOrdered: boolean | null;
}

/** Splits a comma-separated field (matching the existing intervalPlan convention) into trimmed, non-empty items. */
export function parseOptionList(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
}

/**
 * Builds the human-readable spec label stored on `spec` (shown in the
 * catalog table and printed on the Certificate of Analysis) from a
 * structured config — the display string is generated, never hand-typed,
 * once a Result Type is chosen.
 */
export function buildSpecLabel(cfg: ResultTypeConfig, unit: string): string {
  const u = unit ? ` ${unit}` : "";
  if (cfg.resultType === "NUMERIC") {
    switch (cfg.numericMode) {
      case "lte":
        return cfg.numericLimit != null ? `≤${formatNumber(cfg.numericLimit)}${u}` : "No limit set";
      case "gte":
        return cfg.numericLimit != null ? `≥${formatNumber(cfg.numericLimit)}${u}` : "No limit set";
      case "range":
        return cfg.numericMin != null && cfg.numericMax != null
          ? `${formatNumber(cfg.numericMin)}–${formatNumber(cfg.numericMax)}${u}`
          : "No range set";
      case "target":
        return cfg.numericTarget != null && cfg.numericTolerance != null
          ? `${formatNumber(cfg.numericTarget)} ± ${formatNumber(cfg.numericTolerance)}${u}`
          : "No target set";
      case "info":
      default:
        return `Recorded${u} (no spec limit)`;
    }
  }
  if (cfg.resultType === "CATEGORICAL") {
    const options = parseOptionList(cfg.categoricalOptions);
    const passOptions = parseOptionList(cfg.categoricalPassOptions);
    if (passOptions.length === 0) return options.join(" / ") || "No options set";
    if (cfg.categoricalOrdered) {
      // passOptions is the ordered prefix of `options` that counts as a pass —
      // its last entry is the worst-still-acceptable level on the scale.
      return `≤ ${passOptions[passOptions.length - 1]}`;
    }
    return passOptions.join(" or ");
  }
  if (cfg.resultType === "TEXT") return "Descriptive (no spec)";
  return "";
}

/** Structured counterpart to parseSpecVerdict — used only when resultType is explicitly set. */
export function parseStructuredVerdict(cfg: ResultTypeConfig, result: string | null | undefined): SpecVerdict {
  if (!result) return null;
  const trimmed = result.trim();
  if (!trimmed) return null;

  if (cfg.resultType === "NUMERIC") {
    const n = parseFloat(trimmed.replace(/[^0-9.\-]/g, ""));
    if (Number.isNaN(n)) return null;
    switch (cfg.numericMode) {
      case "lte":
        return cfg.numericLimit == null ? null : n <= cfg.numericLimit ? "Pass" : "Fail";
      case "gte":
        return cfg.numericLimit == null ? null : n >= cfg.numericLimit ? "Pass" : "Fail";
      case "range":
        return cfg.numericMin == null || cfg.numericMax == null
          ? null
          : n >= cfg.numericMin && n <= cfg.numericMax
            ? "Pass"
            : "Fail";
      case "target":
        return cfg.numericTarget == null || cfg.numericTolerance == null
          ? null
          : Math.abs(n - cfg.numericTarget) <= cfg.numericTolerance
            ? "Pass"
            : "Fail";
      case "info":
      default:
        return null;
    }
  }

  if (cfg.resultType === "CATEGORICAL") {
    const passOptions = parseOptionList(cfg.categoricalPassOptions);
    if (passOptions.length === 0) return null;
    const eq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

    if (cfg.categoricalOrdered) {
      const options = parseOptionList(cfg.categoricalOptions);
      const resultIndex = options.findIndex((o) => eq(o, trimmed));
      const passIndexes = passOptions.map((p) => options.findIndex((o) => eq(o, p))).filter((i) => i !== -1);
      if (resultIndex === -1 || passIndexes.length === 0) return null;
      return resultIndex <= Math.max(...passIndexes) ? "Pass" : "Fail";
    }

    return passOptions.some((p) => eq(p, trimmed)) ? "Pass" : "Fail";
  }

  // TEXT is purely descriptive — it never has a Pass/Fail verdict.
  return null;
}

/**
 * The verdict dispatcher every read site should use going forward: falls
 * back to the untouched legacy engine for any row that predates this system
 * (resultType === null), otherwise computes from the structured fields.
 */
export function parseVerdict(
  test: ResultTypeConfig & { spec: string },
  result: string | null | undefined
): SpecVerdict {
  if (!test.resultType) return parseSpecVerdict(test.spec, result);
  return parseStructuredVerdict(test, result);
}

/**
 * Progress-bar limit dispatcher (mirrors specNumericLimit for structured
 * rows). Only "at most X" numeric specs have a meaningful bar today, on
 * either path — matches the legacy engine's existing scope.
 */
export function numericLimitFor(test: ResultTypeConfig & { spec: string }): number | null {
  if (!test.resultType) return specNumericLimit(test.spec);
  if (test.resultType === "NUMERIC" && test.numericMode === "lte") return test.numericLimit;
  return null;
}
