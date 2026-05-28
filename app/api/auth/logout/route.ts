import { NextResponse } from "next/server";

import { revokeSession, sessionCookieName } from "@/server/auth/session";

export async function POST(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${sessionCookieName}=`))
    ?.slice(sessionCookieName.length + 1);

  await revokeSession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(sessionCookieName);

  return response;
}

