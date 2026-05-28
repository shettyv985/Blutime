import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { aiSheetSources } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { canUseAiMasterBrain } from "@/server/auth/permissions";
import { db } from "@/server/db/client";
import { createId } from "@/server/ids";
import { extractSpreadsheetId } from "@/server/ai/google-sheets";

export async function GET() {
  const user = await getCurrentUser();

  if (!user || !canUseAiMasterBrain(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const sources = await db
    .select({
      id: aiSheetSources.id,
      name: aiSheetSources.name,
      sheetUrl: aiSheetSources.sheetUrl,
      spreadsheetId: aiSheetSources.spreadsheetId,
      updatedAt: aiSheetSources.updatedAt,
    })
    .from(aiSheetSources)
    .where(eq(aiSheetSources.isActive, true))
    .orderBy(asc(aiSheetSources.name));

  return NextResponse.json({ sources });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canUseAiMasterBrain(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { name?: string; sheetUrl?: string } | null;
  const sheetUrl = body?.sheetUrl?.trim() ?? "";
  const name = body?.name?.trim() || "Google Sheet";

  if (!sheetUrl) {
    return NextResponse.json({ error: "Google Sheet URL is required." }, { status: 400 });
  }

  let spreadsheetId = "";
  try {
    spreadsheetId = extractSpreadsheetId(sheetUrl);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid Google Sheet URL." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const [existing] = await db
    .select({ id: aiSheetSources.id })
    .from(aiSheetSources)
    .where(eq(aiSheetSources.spreadsheetId, spreadsheetId))
    .limit(1);

  if (existing) {
    await db
      .update(aiSheetSources)
      .set({ name, sheetUrl, isActive: true, updatedAt: now })
      .where(eq(aiSheetSources.id, existing.id));
    return NextResponse.json({ ok: true, id: existing.id });
  }

  const id = createId();
  await db.insert(aiSheetSources).values({
    id,
    name,
    sheetUrl,
    spreadsheetId,
    createdByUserId: user.userId,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ ok: true, id });
}
