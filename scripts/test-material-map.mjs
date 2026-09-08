// Standalone verification mirror for the material map resolver.
// Run: node scripts/test-material-map.mjs
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/lib/warehouse-material-map.ts", import.meta.url), "utf8");
// Evaluate only the exported map by extracting the object literal — simpler
// and safe: the file is generated and contains no imports.
const mapMatch = src.match(/WAREHOUSE_MATERIAL_NAMES: Record<string, string> = \{([\s\S]*?)\n\};/);
if (!mapMatch) {
  console.error("Could not find WAREHOUSE_MATERIAL_NAMES object");
  process.exit(1);
}
// eslint-disable-next-line no-eval
const entries = eval(`({${mapMatch[1]}})`);

function normalizeMaterialKey(s) {
  return s.replace(/\s+/g, " ").trim().toUpperCase();
}
function resolveMaterialName(productName) {
  const key = normalizeMaterialKey(productName);
  return entries[key] ?? productName;
}

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

console.log(`Map size: ${Object.keys(entries).length} entries`);

console.log("Known mappings:");
check("2NED -> NA2.EDTA", resolveMaterialName("2NED") === "NA2.EDTA", resolveMaterialName("2NED"));
check("4NED -> EDTA 4NA", resolveMaterialName("4NED") === "EDTA 4NA", resolveMaterialName("4NED"));
check("NISO -> SODIUM NITRITE", resolveMaterialName("NISO") === "SODIUM NITRITE", resolveMaterialName("NISO"));
check("ACHY -> HCL 32%", resolveMaterialName("ACHY") === "HCL 32%", resolveMaterialName("ACHY"));
check("PECA -> PERTASOL CA", resolveMaterialName("PECA") === "PERTASOL CA", resolveMaterialName("PECA"));
check("MOSO -> SODIUM MOLYBDATE", resolveMaterialName("MOSO") === "SODIUM MOLYBDATE", resolveMaterialName("MOSO"));
check("MOME ET -> MONO METHYL ETHER OF HYDROQUINONE (MEHQ)", resolveMaterialName("MOME ET") === "MONO METHYL ETHER OF HYDROQUINONE (MEHQ)", resolveMaterialName("MOME ET"));
check("CAHY -> CALCIUM HYDROXIDE", resolveMaterialName("CAHY") === "CALCIUM HYDROXIDE", resolveMaterialName("CAHY"));

console.log("Whitespace normalization:");
check("POW  31 (kamus double-space) resolves", resolveMaterialName("POW 31") === "POLYACRYLAMIDE W-3176", resolveMaterialName("POW 31"));
check("lowercase input resolves", resolveMaterialName("2ned") === "NA2.EDTA", resolveMaterialName("2ned"));
check("trailing space resolves", resolveMaterialName(" 2NED ") === "NA2.EDTA", resolveMaterialName(" 2NED "));

console.log("Pass-through (no mapping):");
check("finished goods unchanged", resolveMaterialName("POWERWAX 133 (IBC 1000L)") === "POWERWAX 133 (IBC 1000L)");
check("already-descriptive unchanged", resolveMaterialName("XYLENE CLEANING") === "XYLENE CLEANING");
check("packaging unchanged", resolveMaterialName("IBC TANK 1000L REKONDISI") === "IBC TANK 1000L REKONDISI");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
