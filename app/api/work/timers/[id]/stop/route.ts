import { and, eq, inArray, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { activeTimers, clients, timeEntries } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { createId } from "@/server/ids";
import { autoPauseOverlongTimers } from "@/server/timers/auto-pause";
import { elapsedSeconds } from "@/server/timers/time";
import { serializeWorkSlots } from "@/server/timers/work-slots";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function parseNokkScore(value: unknown) {
  if (typeof value === "string" && value.trim().toUpperCase() === "NA") return null;
  if (value === null || value === undefined || value === "") return null;

  const score = Number(value);
  if (!Number.isInteger(score) || score < 1 || score > 10) return undefined;

  return score;
}

export async function POST(request: Request, context: RouteParams) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { nokkScore?: number | string | null; outputSummary?: string } | null;
  const outputSummary = body?.outputSummary?.trim();
  const nokkScore = parseNokkScore(body?.nokkScore);

  if (!outputSummary) {
    return NextResponse.json({ error: "Output / Summary is required." }, { status: 400 });
  }

  if (nokkScore === undefined) {
    return NextResponse.json({ error: "NOKK score must be NA or a number from 1 to 10." }, { status: 400 });
  }

  await autoPauseOverlongTimers(user.userId);

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
    workSlotsJson: serializeWorkSlots([{ startedAt: timer.startedAt, endedAt: now }]),
    outputSummary,
    nokkScore,
    simultaneousNote,
    createdAt: now,
    updatedAt: now,
  });

  await db.delete(activeTimers).where(eq(activeTimers.id, id));

  return NextResponse.json({ ok: true });
}
