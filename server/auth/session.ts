import "server-only";

import { and, eq, gt, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";

import { departments, sessions, users } from "@/db/schema";
import { db } from "@/server/db/client";
import { createId } from "@/server/ids";

export const sessionCookieName = "blu_time_session";
export const sessionDurationDays = 30;

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createSessionExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + sessionDurationDays);
  return expiresAt;
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function createSession(userId: string) {
  const token = createSessionToken();
  const expiresAt = createSessionExpiresAt();

  await db.insert(sessions).values({
    id: createId(),
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
  });

  return {
    token,
    expiresAt,
  };
}

export async function getSessionUser(token: string | undefined) {
  if (!token) return null;

  const [sessionUser] = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      accessRole: users.accessRole,
      departmentId: users.departmentId,
      departmentName: departments.name,
      departmentSlug: departments.slug,
      basecampPersonId: users.basecampPersonId,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(
      and(
        eq(sessions.tokenHash, hashSessionToken(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date().toISOString()),
        eq(users.isActive, true)
      )
    )
    .limit(1);

  return sessionUser ?? null;
}

export async function revokeSession(token: string | undefined) {
  if (!token) return;

  await db
    .update(sessions)
    .set({ revokedAt: new Date().toISOString() })
    .where(eq(sessions.tokenHash, hashSessionToken(token)));
}
