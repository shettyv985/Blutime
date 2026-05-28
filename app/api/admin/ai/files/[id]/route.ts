import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { aiFileSources } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { canUseAiMasterBrain } from "@/server/auth/permissions";
import { db } from "@/server/db/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteParams) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user || !canUseAiMasterBrain(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await db
    .update(aiFileSources)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(aiFileSources.id, id));

  return NextResponse.json({ ok: true });
}
