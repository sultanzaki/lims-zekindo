"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { decodeNfcPayload, pathForNfcEntity, type NfcEntityType } from "@/lib/nfc";

// Sample NFC tags follow the sample detail page's own access rule (any
// logged-in user can view/act on a sample) — Equipment and Reagent/Chemical
// follow the inventory management role, same as their other write actions.
async function requireManageAccess(entityType: NfcEntityType) {
  if (entityType === "SAMPLE") return requireUser();
  return requireRole(canManageInventoryAndCatalog);
}

async function entityLabel(entityType: NfcEntityType, entityId: string): Promise<string | null> {
  if (entityType === "SAMPLE") {
    const s = await prisma.sample.findUnique({ where: { id: entityId }, select: { id: true, name: true } });
    if (!s) return null;
    return s.name ? `sample ${s.name} (${s.id})` : `sample ${s.id}`;
  }
  if (entityType === "EQUIPMENT") {
    const e = await prisma.equipment.findUnique({ where: { id: entityId }, select: { name: true, assetTag: true } });
    return e ? `equipment ${e.name} (${e.assetTag})` : null;
  }
  const r = await prisma.reagent.findUnique({ where: { id: entityId }, select: { name: true, lotNumber: true } });
  return r ? `reagent ${r.name} (Lot ${r.lotNumber})` : null;
}

export type NfcConflictResult = { conflict: false } | { conflict: true; label: string };

/**
 * Reads whatever was already on the tag (or null for a blank/foreign tag)
 * and reports whether it's already actively registered to a DIFFERENT
 * entity. The register/replace flow blocks on a conflict rather than
 * silently reassigning — the physical tag has to be deactivated from its
 * current entity first.
 */
export async function checkNfcTagConflictAction(rawText: string | null): Promise<NfcConflictResult> {
  await requireUser();
  const token = decodeNfcPayload(rawText);
  if (!token) return { conflict: false };

  const existing = await prisma.nfcTag.findUnique({ where: { token } });
  if (!existing || !existing.active) return { conflict: false };

  const label = (await entityLabel(existing.entityType as NfcEntityType, existing.entityId)) ?? `${existing.entityType.toLowerCase()} ${existing.entityId}`;
  return { conflict: true, label };
}

export type SaveNfcTagResult = { error: string } | { ok: true };

export async function saveNfcTagAction(params: {
  entityType: NfcEntityType;
  entityId: string;
  token: string;
  serialNumber: string | null;
}): Promise<SaveNfcTagResult> {
  const user = await requireManageAccess(params.entityType);

  // Defense in depth: re-check the freshly-written token isn't already
  // active elsewhere, in case two people raced to register the same
  // physical tag between this browser's conflict check and this save.
  const tokenOwner = await prisma.nfcTag.findUnique({ where: { token: params.token } });
  if (tokenOwner && tokenOwner.active && !(tokenOwner.entityType === params.entityType && tokenOwner.entityId === params.entityId)) {
    return { error: "This tag was just registered to another item. Please try a different tag." };
  }

  const existingActive = await prisma.nfcTag.findFirst({
    where: { entityType: params.entityType, entityId: params.entityId, active: true },
  });

  await prisma.$transaction([
    ...(existingActive
      ? [
          prisma.nfcTag.update({
            where: { id: existingActive.id },
            data: {
              active: false,
              deactivatedBy: `${user.name}, ${user.role}`,
              deactivatedAt: new Date(),
              deactivatedReason: "Replaced with new tag",
            },
          }),
        ]
      : []),
    prisma.nfcTag.create({
      data: {
        token: params.token,
        serialNumber: params.serialNumber,
        entityType: params.entityType,
        entityId: params.entityId,
        registeredBy: `${user.name}, ${user.role}`,
      },
    }),
  ]);

  await logAudit({
    userId: user.id,
    action: existingActive ? "nfcTag.replaced" : "nfcTag.registered",
    entityType: params.entityType,
    entityId: params.entityId,
  });

  revalidatePath(pathForNfcEntity(params.entityType, params.entityId));
  return { ok: true };
}

export type ResolveNfcTagResult =
  | { status: "ok"; redirectPath: string }
  | { status: "inactive" }
  | { status: "unknown" };

/** Used by the scan page: turns a scanned tag's raw NDEF text into where to go. */
export async function resolveNfcTagAction(rawText: string): Promise<ResolveNfcTagResult> {
  await requireUser();
  const token = decodeNfcPayload(rawText);
  if (!token) return { status: "unknown" };

  const tag = await prisma.nfcTag.findUnique({ where: { token } });
  if (!tag) return { status: "unknown" };
  if (!tag.active) return { status: "inactive" };

  const entityType = tag.entityType as NfcEntityType;
  const path = pathForNfcEntity(entityType, tag.entityId);
  // Chemicals/reagents: jump straight to the Log Usage form already on
  // that detail page, instead of just the read-only info at the top.
  return { status: "ok", redirectPath: entityType === "REAGENT" ? `${path}?action=log` : path };
}
