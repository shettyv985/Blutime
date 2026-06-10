import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { activeTimers, categories, clients, timeEntries } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { getAssignedTasksForPerson } from "@/server/basecamp/client";
import { db } from "@/server/db/client";
import { autoPauseOverlongTimers } from "@/server/timers/auto-pause";
import { elapsedSeconds } from "@/server/timers/time";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const autoPausedTimerIds = await autoPauseOverlongTimers(user.userId);

  const [categoryRows, activeTimerRows, timeEntryRows, basecampTasks] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.isActive, true)),
    db
      .select({
        id: activeTimers.id,
        clientName: clients.name,
        categoryName: categories.name,
        taskTitle: activeTimers.taskTitle,
        taskSource: activeTimers.taskSource,
        startedAt: activeTimers.startedAt,
        runningSince: activeTimers.runningSince,
        elapsedBeforePauseSeconds: activeTimers.elapsedBeforePauseSeconds,
        status: activeTimers.status,
      })
      .from(activeTimers)
      .innerJoin(clients, eq(activeTimers.clientId, clients.id))
      .innerJoin(categories, eq(activeTimers.categoryId, categories.id))
      .where(and(eq(activeTimers.userId, user.userId), inArray(activeTimers.status, ["running", "paused"]))),
    db
      .select({
        id: timeEntries.id,
        clientName: clients.name,
        categoryName: categories.name,
        taskTitle: timeEntries.taskTitle,
        outputSummary: timeEntries.outputSummary,
        simultaneousNote: timeEntries.simultaneousNote,
        nokkScore: timeEntries.nokkScore,
        startedAt: timeEntries.startedAt,
        endedAt: timeEntries.endedAt,
        totalSeconds: timeEntries.totalSeconds,
      })
      .from(timeEntries)
      .innerJoin(clients, eq(timeEntries.clientId, clients.id))
      .innerJoin(categories, eq(timeEntries.categoryId, categories.id))
      .where(and(eq(timeEntries.userId, user.userId), isNull(timeEntries.deletedAt)))
      .orderBy(desc(timeEntries.startedAt))
      .limit(20),
    user.basecampPersonId ? getAssignedTasksForPerson(user.basecampPersonId).catch(() => []) : [],
  ]);

  return NextResponse.json({
    categories: categoryRows,
    basecampTasks,
    autoPausedTimerIds,
    activeTimers: activeTimerRows.map((timer) => ({
      ...timer,
      elapsedSeconds: elapsedSeconds(timer),
    })),
    timeEntries: timeEntryRows,
  });
}
