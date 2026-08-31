import { prisma } from "@/lib/db";
import { decodeNfcPayload, pathForNfcEntity, type NfcEntityType } from "@/lib/nfc";

// The DB-touching half of NFC tag resolution, split out of
// src/lib/nfc.ts (which stays prisma-free — it's imported by a client
// component, NfcTagPanel.tsx) so both the web resolveNfcTagAction and the
// new mobile /api/mobile/nfc/resolve route share one lookup instead of two.
export type NfcResolveResult =
  | { status: "ok"; entityType: NfcEntityType; entityId: string; redirectPath: string }
  | { status: "inactive" }
  | { status: "unknown" };

export async function resolveNfcToken(rawText: string): Promise<NfcResolveResult> {
  const token = decodeNfcPayload(rawText);
  if (!token) return { status: "unknown" };

  const tag = await prisma.nfcTag.findUnique({ where: { token } });
  if (!tag) return { status: "unknown" };
  if (!tag.active) return { status: "inactive" };

  const entityType = tag.entityType as NfcEntityType;
  const path = pathForNfcEntity(entityType, tag.entityId);
  // Chemicals/reagents: jump straight to the Log Usage form already on
  // that detail page, instead of just the read-only info at the top.
  return {
    status: "ok",
    entityType,
    entityId: tag.entityId,
    redirectPath: entityType === "REAGENT" ? `${path}?action=log` : path,
  };
}
