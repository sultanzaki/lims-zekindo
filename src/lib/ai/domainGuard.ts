// Server-side domain guard for the LIMS assistant.
//
// The model prompt (SYSTEM_PROMPT) tells the assistant to refuse off-topic
// questions, but prompt instructions alone are soft — a strong guard needs a
// hard check in code that runs BEFORE the LLM is ever called. This module is
// that check: it classifies the user's message as in-domain (about the lab /
// LIMS) or off-domain (nasi goreng recipes, weather, politics, coding help,
// creative writing, ...) and the chat route rejects off-domain messages
// outright without spending a model call.
//
// Design notes:
// - Conservative by default: if we can't tell, we ALLOW the message through
//   to the model (the system prompt still tells it to refuse). The guard is
//   a first line of defence for obvious cases, not a replacement for the
//   prompt. Blocking a legitimate lab question would be worse than letting
//   one off-topic question reach the model.
// - Matching is on lowercased text with word boundaries. Indonesian and
//   English lab vocabulary are both covered because the lab works in both.

// Strong in-domain signals — if the message mentions any of these we treat it
// as on-topic even if it also contains off-topic words ("kalau lagi bikin
// nasi goreng, cara catat pemakaian reagen apa?" is still a lab question).
const IN_DOMAIN_TERMS = [
  // entities & workflow
  "sample", "sampel", "test", "uji", "pengujian", "hasil", "result", "reading",
  "replicate", "duplo", "triplo", "checkpoint", "interval", "spek", "spec",
  "coa", "sertifikat", "certificate", "deviation", "oos", "capa", "reject",
  "approve", "review", "qa", "supervisor", "technician", "teknisi", "analis",
  "lab", "laboratorium", "lims", "customer", "requestor", "business unit",
  // inventory
  "reagent", "reagen", "chemical", "bahan kimia", "stok", "stock", "expired",
  "kedaluwarsa", "kadaluarsa", "equipment", "alat", "instrument", "kalibrasi",
  "calibration", "maintenance", "perawatan", "warehouse", "gudang", "storage",
  "penyimpanan", "location", "lokasi", "nfc", "barcode", "label",
  // data & analytics
  "tat", "turnaround", "overdue", "terlambat", "deadline", "due", "analytics",
  "dashboard", "kpi", "insight", "statistik", "notification", "notifikasi",
  "audit", "riwayat", "history", "tracking", "lacak", "status",
  "tenggat", "jadwal", "schedule", "kalender", "calendar",
  // actions
  "login", "log in", "catat", "record", "input", "entry", "submit", "kirim",
  "dispose", "buang", "usage", "pemakaian", "stok masuk", "stok keluar",
];

// Strong off-domain signals — phrased so that ordinary lab talk rarely hits
// them. Anything matching is rejected unless an in-domain term is also
// present.
const OFF_DOMAIN_TERMS = [
  "resep", "nasi goreng", "masakan", "makanan", "minuman", "recipe", "cook",
  "cooking", "baking", "kue",
  "cuaca", "weather", "ramalan", "prediksi cuaca",
  "politik", "politics", "presiden", "pemilu", "election",
  "berita", "news", "artis", "selebriti", "celebrity", "gossip", "gosip",
  "film", "movie", "lagu", "song", "musik", "music", "game", "permainan",
  "olahraga", "sport", "sepak bola", "football",
  "coding", "programming", "koding", "pemrograman", "javascript", "python",
  "react", "bug code", "tulis kode", "debug",
  "matematika", "math", "fisika", "physics", "kimia umum", "tugas sekolah",
  "pr", "homework", "puisi", "poem", "cerita", "story", "karangan",
  "terjemahkan", "translate", "tolong buatkan", "buatkan saya",
  "cara bikin", "cara membuat", "how to make", "how to cook",
  "lagu apa", "film apa", "rekomendasi",
];

/** Lowercase + trim, collapse internal whitespace. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((t) => {
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  });
}

export type TopicVerdict =
  | { decision: "allow" }
  | { decision: "reject"; reason: string };

/**
 * Classify a user message as in-domain or off-domain for the LIMS assistant.
 *
 * - in-domain term present  → allow (even if off-domain words also appear)
 * - no in-domain term, off-domain term present → reject
 * - neither → allow (model/system prompt handles the grey zone)
 */
export function classifyTopic(text: string): TopicVerdict {
  const t = normalize(text);
  if (!t) return { decision: "allow" };

  const inDomain = hasAny(t, IN_DOMAIN_TERMS);
  if (inDomain) return { decision: "allow" };

  const offDomain = hasAny(t, OFF_DOMAIN_TERMS);
  if (offDomain) {
    return {
      decision: "reject",
      reason:
        "I'm the Zekindo lab assistant — I can only help with LIMS and laboratory work (samples, tests, results, reagents, equipment, inventory, analytics, and so on). That question is outside what I do.",
    };
  }

  return { decision: "allow" };
}

// --- jailbreak / role-play / system-prompt-extraction phrases ---------------

const JAILBREAK_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
  /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/i,
  /you\s+are\s+now\s+(?!not\b)/i,
  /act\s+as\s+(if|a|an)\b/i,
  /new\s+(system\s+)?prompt/i,
  /system\s+prompt/i,
  /developer\s+(message|prompt|instruction)/i,
  /(do\s+not|don'?t)\s+(follow|obey|listen\s+to)/i,
  /(show|print|reveal|display|leak|repeat|share)\s+(your\s+|the\s+)?(system|developer|hidden|initial)\s+(prompt|instructions?|message)/i,
  /what\s+is\s+your\s+(system\s+)?prompt/i,
  /what\s+are\s+your\s+(instructions?|rules?)/i,
  /jailbreak|dan\s+mode|developer\s+mode|god\s+mode|sudo\s+mode/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /role\s+play/i,
  /tidak\s+ada\s+batasan/i,
  /bebas\s+dari\s+(aturan|instruksi)/i,
];

export function looksLikeJailbreak(text: string): boolean {
  const t = normalize(text);
  return JAILBREAK_PATTERNS.some((re) => re.test(t));
}
