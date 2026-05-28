import { and, eq, inArray, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { activeTimers, clients, timeEntries } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { createId } from "@/server/ids";
import { elapsedSeconds } from "@/server/timers/time";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { outputSummary?: string } | null;
  const outputSummary = body?.outputSummary?.trim();

  if (!outputSummary) {
    return NextResponse.json({ error: "Output / Summary is required." }, { status: 400 });
  }

  const [timer] = await db
    .select()
    .from(activeTimers)
    .where(and(eq(activeTimers.id, id), eq(activeTimers.userId, user.userId)))
    .limit(1);

  if (!timer) {
    return NextResponse.json({ error: "Timer not found." }, { status: 404 });
  }

  const overlappingTimers = await db
    .select({
      taskTitle: activeTimers.taskTitle,
      clientName: clients.name,
    })
    .from(activeTimers)
    .innerJoin(clients, eq(activeTimers.clientId, clients.id))
    .where(
      and(
        eq(activeTimers.userId, user.userId),
        ne(activeTimers.id, id),
        inArray(activeTimers.status, ["running", "paused"])
      )
    );

  const simultaneousNote =
    overlappingTimers.length > 0
      ? `Simultaneously worked on: ${overlappingTimers
          .map((item) => `${item.clientName} - ${item.taskTitle}`)
          .join(", ")}`
      : null;

  const now = new Date().toISOString();

  await db.insert(timeEntries).values({
    id: createId(),
    userId: user.userId,
    clientId: timer.clientId,
    categoryId: timer.categoryId,
    taskSource: timer.taskSource,
    taskTitle: timer.taskTitle,
    basecampTaskId: timer.basecampTaskId,
    basecampTaskType: timer.basecampTaskType,
    basecampTaskUrl: timer.basecampTaskUrl,
    basecampParentId: timer.basecampParentId,
    basecampParentTitle: timer.basecampParentTitle,
    basecampDueOn: timer.basecampDueOn,
    startedAt: timer.startedAt,
    endedAt: now,
    totalSeconds: elapsedSeconds(timer),
    outputSummary,
    simultaneousNote,
    createdAt: now,
    updatedAt: now,
  });

  await db.delete(activeTimers).where(eq(activeTimers.id, id));

  return NextResponse.json({ ok: true });
}
