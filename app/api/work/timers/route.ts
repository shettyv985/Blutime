import { and, count, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { activeTimers, categories, clients, type TaskSource } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { createId } from "@/server/ids";

type StartTimerBody = {
  taskSource?: TaskSource;
  taskTitle?: string;
  categoryId?: string;
  clientName?: string;
  basecampProjectId?: string | null;
  basecampProjectUrl?: string | null;
  basecampTaskId?: string | null;
  basecampTaskType?: string | null;
  basecampTaskUrl?: string | null;
  basecampParentId?: string | null;
  basecampParentTitle?: string | null;
  basecampDueOn?: string | null;
};

async function findOrCreateClient(input: {
  name: string;
  basecampProjectId?: string | null;
  basecampProjectUrl?: string | null;
}) {
  const now = new Date().toISOString();
  const name = input.name.trim();

  if (input.basecampProjectId) {
    const [byProjectId] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.basecampProjectId, input.basecampProjectId))
      .limit(1);

    if (byProjectId) return byProjectId.id;
  }

  const [byName] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.name, name))
    .limit(1);

  if (byName) return byName.id;

  const id = createId();
  await db.insert(clients).values({
    id,
    name,
    basecampProjectId: input.basecampProjectId ?? null,
    basecampProjectUrl: input.basecampProjectUrl ?? null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as StartTimerBody | null;
  const taskTitle = body?.taskTitle?.trim();
  const clientName = body?.clientName?.trim();
  const categoryId = body?.categoryId?.trim();
  const taskSource = body?.taskSource ?? "unplanned";

  if (!taskTitle || !clientName || !categoryId) {
    return NextResponse.json({ error: "Task, client, and category are required." }, { status: 400 });
  }

  const [{ value: activeCount }] = await db
    .select({ value: count() })
    .from(activeTimers)
    .where(and(eq(activeTimers.userId, user.userId), inArray(activeTimers.status, ["running", "paused"])));

  if ((activeCount ?? 0) >= 5) {
    return NextResponse.json({ error: "You can run at most 5 timers." }, { status: 400 });
  }

  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.isActive, true)))
    .limit(1);

  if (!category) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }

  const clientId = await findOrCreateClient({
    name: clientName,
    basecampProjectId: body?.basecampProjectId ?? null,
    basecampProjectUrl: body?.basecampProjectUrl ?? null,
  });
  const now = new Date().toISOString();

  await db.insert(activeTimers).values({
    id: createId(),
    userId: user.userId,
    clientId,
    categoryId,
    taskSource,
    taskTitle,
    basecampTaskId: body?.basecampTaskId ?? null,
    basecampTaskType: body?.basecampTaskType ?? null,
    basecampTaskUrl: body?.basecampTaskUrl ?? null,
    basecampParentId: body?.basecampParentId ?? null,
    basecampParentTitle: body?.basecampParentTitle ?? null,
    basecampDueOn: body?.basecampDueOn ?? null,
    startedAt: now,
    runningSince: now,
    elapsedBeforePauseSeconds: 0,
    status: "running",
    lastHeartbeatAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
