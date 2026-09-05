"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isAdmin, ACCESS_ROLES } from "@/lib/roles";

export type FormState = { error?: string; tempPassword?: string };

function randomPassword() {
  return randomBytes(9).toString("base64url");
}

function initialsFrom(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export async function createUserAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const admin = await requireRole(isAdmin);

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const employeeId = String(formData.get("employeeId") || "").trim().toUpperCase();
  const role = String(formData.get("role") || "").trim();
  const section = String(formData.get("section") || "").trim();
  const accessRole = String(formData.get("accessRole") || "TECHNICIAN");

  if (!name || !email || !employeeId || !role || !section) {
    return { error: "Fill in all fields." };
  }
  if (!ACCESS_ROLES.includes(accessRole as (typeof ACCESS_ROLES)[number])) {
    return { error: "Invalid access role." };
  }

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { employeeId }] } });
  if (existing) return { error: "Email or Employee ID already in use." };

  const tempPassword = randomPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      employeeId,
      role,
      section,
      accessRole,
      initials: initialsFrom(name),
      passwordHash,
    },
  });

  await logAudit({ userId: admin.id, action: "user.created", entityType: "User", entityId: user.id, detail: email });

  revalidatePath("/admin/users");
  return { tempPassword };
}

export async function setUserActiveAction(userId: string, active: boolean) {
  const admin = await requireRole(isAdmin);
  await prisma.user.update({ where: { id: userId }, data: { active } });
  await logAudit({
    userId: admin.id,
    action: active ? "user.reactivated" : "user.deactivated",
    entityType: "User",
    entityId: userId,
    metadata: { active: { from: !active, to: active } },
  });
  revalidatePath("/admin/users");
}

export async function resetPasswordAction(userId: string): Promise<FormState> {
  const admin = await requireRole(isAdmin);
  const tempPassword = randomPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  // sessionVersion increment invalidates every session the target user had
  // open before the reset — a leaked cookie can't survive a password reset.
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });
  await logAudit({ userId: admin.id, action: "user.password_reset", entityType: "User", entityId: userId });
  revalidatePath("/admin/users");
  return { tempPassword };
}
