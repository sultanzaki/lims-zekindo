export const NFC_ENTITY_TYPES = ["SAMPLE", "EQUIPMENT", "REAGENT"] as const;
export type NfcEntityType = (typeof NFC_ENTITY_TYPES)[number];

// Prefix written into the tag's NDEF text record so a scan can tell "one of
// our tokens" apart from a blank tag or a tag some other app already wrote
// unrelated content to.
const NFC_TOKEN_PREFIX = "zlims:";

export function encodeNfcPayload(token: string): string {
  return `${NFC_TOKEN_PREFIX}${token}`;
}

export function decodeNfcPayload(text: string | null | undefined): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  return trimmed.startsWith(NFC_TOKEN_PREFIX) ? trimmed.slice(NFC_TOKEN_PREFIX.length) : null;
}

export function pathForNfcEntity(entityType: NfcEntityType, entityId: string): string {
  if (entityType === "SAMPLE") return `/samples/${entityId}`;
  if (entityType === "EQUIPMENT") return `/inventory/equipment/${entityId}`;
  return `/inventory/reagents/${entityId}`;
}
