import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { aiChatSessions } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { canUseAiMasterBrain } from "@/server/auth/permissions";
import { db } from "@/server/db/client";
import { createId } from "@/server/ids";

function parseJsonArray<T>(value: string | null | undefined, fallback: T[] = []) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function serializeChat(row: typeof aiChatSessions.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    provider: row.provider === "openai" ? "openai" : "manus",
    messages: parseJsonArray(row.messagesJson),
    activeTaskId: row.activeTaskId,
    activeTaskUrl: row.activeTaskUrl,
    includeContextOnNextMessage: row.includeContextOnNextMessage,
    selectedSourceIds: parseJsonArray<string>(row.selectedSourceIdsJson),
    selectedFileIds: parseJsonArray<string>(row.selectedFileIdsJson),
    attachedLinks: parseJsonArray<string>(row.attachedLinksJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user || !canUseAiMasterBrain(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(aiChatSessions)
    .where(and(eq(aiChatSessions.ownerUserId, user.userId), eq(aiChatSessions.isArchived, false)))
    .orderBy(desc(aiChatSessions.updatedAt));

  return NextResponse.json({ chats: rows.map(serializeChat) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || !canUseAiMasterBrain(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { title?: string; provider?: string } | null;
  const now = new Date().toISOString();
  const id = createId();

  await db.insert(aiChatSessions).values({
    id,
    ownerUserId: user.userId,
    title: body?.title?.trim() || "New chat",
    provider: body?.provider === "openai" ? "openai" : "manus",
    messagesJson: "[]",
    selectedSourceIdsJson: "[]",
    selectedFileIdsJson: "[]",
    attachedLinksJson: "[]",
    includeContextOnNextMessage: true,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  });

  const [chat] = await db.select().from(aiChatSessions).where(eq(aiChatSessions.id, id)).limit(1);

  return NextResponse.json({ chat: serializeChat(chat) }, { status: 201 });
}
