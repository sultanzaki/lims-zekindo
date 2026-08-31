import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

// Bearer-token auth for the mobile app — separate from the web's cookie
// session (src/lib/auth.ts). Short-lived JWT access token for the hot path
// (verified with no DB hit beyond the final user lookup, same shape as
// auth.ts) paired with a long-lived, DB-backed, rotating refresh token
// (same "opaque random value, only its hash stored" pattern as the tracking
// codes in src/lib/tracking.ts) so a lost/stolen device's session can
// actually be revoked — a pure stateless JWT can't be.

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 90; // 90 days

if (!process.env.MOBILE_JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error(
    "MOBILE_JWT_SECRET is not set. Refusing to start in production with the public default signing key — anyone could forge a valid mobile access token. Set MOBILE_JWT_SECRET in your environment."
  );
}

const secret = new TextEncoder().encode(
  process.env.MOBILE_JWT_SECRET || "dev-mobile-secret-change-me-please-32chars"
);

export async function issueAccessToken(userId: string) {
  return new SignJWT({ userId, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL_SECONDS)
    .sign(secret);
}

async function verifyAccessToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "access" || typeof payload.userId !== "string") return null;
    return payload.userId;
  } catch {
    return null;
  }
}

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

function generateRawToken() {
  return randomBytes(32).toString("base64url");
}

export async function createRefreshToken(userId: string, deviceLabel?: string) {
  const raw = generateRawToken();
  await prisma.mobileRefreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      deviceLabel: deviceLabel || null,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return raw;
}

export type RefreshResult =
  | { user: User; refreshToken: string }
  | { error: "invalid" | "expired" | "reused" };

// If the presented token is already revoked (hash matches a row that was
// already rotated away or logged out), that's a replay of a stale token —
// revoke every other active token for that user as a precaution, rather than
// just rejecting this one call.
export async function rotateRefreshToken(rawToken: string): Promise<RefreshResult> {
  const tokenHash = hashToken(rawToken);
  const existing = await prisma.mobileRefreshToken.findUnique({ where: { tokenHash } });
  if (!existing) return { error: "invalid" };

  if (existing.revokedAt) {
    await prisma.mobileRefreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { error: "reused" };
  }

  if (existing.expiresAt < new Date()) {
    return { error: "expired" };
  }

  const user = await prisma.user.findUnique({ where: { id: existing.userId } });
  if (!user || !user.active) return { error: "invalid" };

  const newRaw = generateRawToken();
  const newToken = await prisma.mobileRefreshToken.create({
    data: {
      userId: existing.userId,
      tokenHash: hashToken(newRaw),
      deviceLabel: existing.deviceLabel,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  await prisma.mobileRefreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date(), lastUsedAt: new Date(), replacedById: newToken.id },
  });

  return { user, refreshToken: newRaw };
}

export async function revokeRefreshToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  await prisma.mobileRefreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export type MobileAuthResult = { user: User } | { error: NextResponse };

export async function requireMobileUser(req: NextRequest): Promise<MobileAuthResult> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return {
      error: NextResponse.json({ ok: false, error: "Missing bearer token." }, { status: 401 }),
    };
  }

  const userId = await verifyAccessToken(token);
  if (!userId) {
    return {
      error: NextResponse.json({ ok: false, error: "Invalid or expired token." }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) {
    return {
      error: NextResponse.json({ ok: false, error: "Account not found or inactive." }, { status: 401 }),
    };
  }

  return { user };
}

export function toMobileUser(user: User) {
  return {
    id: user.id,
    employeeId: user.employeeId,
    email: user.email,
    name: user.name,
    initials: user.initials,
    role: user.role,
    section: user.section,
    accessRole: user.accessRole,
  };
}
