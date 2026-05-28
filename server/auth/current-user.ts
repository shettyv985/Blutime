import "server-only";

import { cookies } from "next/headers";

import { getSessionUser, sessionCookieName } from "@/server/auth/session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  return getSessionUser(token);
}

