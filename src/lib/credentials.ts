import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;
export const GENERIC_LOGIN_ERROR = "Invalid email/employee ID or password.";

export type CredentialCheckResult = { user: User } | { error: string };

// Shared by the web login Server Action (src/lib/actions/auth.ts) and the
// mobile login route (src/app/api/mobile/auth/login) so the lockout/bcrypt
// logic — and its generic error message, which deliberately doesn't
// distinguish "no such account" from "wrong password" — only exists once.
export async function verifyCredentials(
  identifier: string,
  password: string
): Promise<CredentialCheckResult> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { employeeId: identifier.toUpperCase() },
      ],
    },
  });

  if (!user) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { error: "Too many failed attempts. Try again in a few minutes." };
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const attempts = user.failedLoginAttempts + 1;
    const locked = attempts >= MAX_LOGIN_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: locked ? 0 : attempts,
        lockedUntil: locked ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null,
      },
    });
    return { error: GENERIC_LOGIN_ERROR };
  }

  if (!user.active) {
    return { error: "This account has been deactivated. Contact your Lab Manager." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  return { user };
}
