import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { aiChatSessions } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { canUseAiMasterBrain } from "@/server/auth/permissions";
import { db } from "@/server/db/client";

type RouteParams = {
  params: Promise<{ id: string }>;
};

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

export async function PATCH(request: Request, context: RouteParams) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user || !canUseAiMasterBrain(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    provider?: string;
    messages?: unknown[];
    activeTaskId?: string | null;
    activeTaskUrl?: string | null;
    includeContextOnNextMessage?: boolean;
    selectedSourceIds?: string[];
    selectedFileIds?: string[];
    attachedLinks?: string[];
  } | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid chat payload." }, { status: 400 });
  }

  const now = new Date().toISOString();

  await db
    .update(aiChatSessions)
    .set({
      ...(typeof body.title === "string" ? { title: body.title.trim() || "New chat" } : {}),
      ...(body.provider ? { provider: body.provider === "openai" ? "openai" : "manus" } : {}),
      ...(Array.isArray(body.messages) ? { messagesJson: JSON.stringify(body.messages) } : {}),
      ...(body.activeTaskId !== undefined ? { activeTaskId: body.activeTaskId } : {}),
      ...(body.activeTaskUrl !== undefined ? { activeTaskUrl: body.activeTaskUrl } : {}),
      ...(typeof body.includeContextOnNextMessage === "boolean"
        ? { includeContextOnNextMessage: body.includeContextOnNextMessage }
        : {}),
      ...(Array.isArray(body.selectedSourceIds)
        ? { selectedSourceIdsJson: JSON.stringify(body.selectedSourceIds) }
        : {}),
      ...(Array.isArray(body.selectedFileIds)
        ? { selectedFileIdsJson: JSON.stringify(body.selectedFileIds) }
        : {}),
      ...(Array.isArray(body.attachedLinks) ? { attachedLinksJson: JSON.stringify(body.attachedLinks) } : {}),
      updatedAt: now,
    })
    .where(and(eq(aiChatSessions.id, id), eq(aiChatSessions.ownerUserId, user.userId)));

  const [chat] = await db
    .select()
    .from(aiChatSessions)
    .where(and(eq(aiChatSessions.id, id), eq(aiChatSessions.ownerUserId, user.userId)))
    .limit(1);

  if (!chat) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  return NextResponse.json({ chat: serializeChat(chat) });
}

export async function DELETE(_request: Request, context: RouteParams) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user || !canUseAiMasterBrain(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const now = new Date().toISOString();

  await db
    .update(aiChatSessions)
    .set({ isArchived: true, updatedAt: now })
    .where(and(eq(aiChatSessions.id, id), eq(aiChatSessions.ownerUserId, user.userId)));

  return NextResponse.json({ ok: true });
}
