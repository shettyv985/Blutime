import { and, desc, eq, gte, isNull, lt } from "drizzle-orm";
import { NextResponse } from "next/server";

import { categories, clients, timeEntries } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { db } from "@/server/db/client";
import { parseStoredWorkSlots } from "@/server/timers/work-slots";

const dayMs = 24 * 60 * 60 * 1000;

function dateRangeInIst(start: string | null, end: string | null) {
  if (!start && !end) return null;

  const startKey = start || end;
  const endKey = end || start;
  if (!startKey || !endKey) return null;

  return {
    startIso: new Date(`${startKey}T00:00:00+05:30`).toISOString(),
    endIso: new Date(new Date(`${endKey}T00:00:00+05:30`).getTime() + dayMs).toISOString(),
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const range = dateRangeInIst(url.searchParams.get("start"), url.searchParams.get("end"));
  const conditions = [eq(timeEntries.userId, user.userId), isNull(timeEntries.deletedAt)];

  if (range) {
    conditions.push(gte(timeEntries.endedAt, range.startIso), lt(timeEntries.endedAt, range.endIso));
  }

  const rows = await db
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
      workSlotsJson: timeEntries.workSlotsJson,
    })
    .from(timeEntries)
    .innerJoin(clients, eq(timeEntries.clientId, clients.id))
    .innerJoin(categories, eq(timeEntries.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(desc(timeEntries.startedAt))
    .limit(200);

  return NextResponse.json({
    timeEntries: rows.map(({ workSlotsJson, ...row }) => ({
      ...row,
      workSlots: parseStoredWorkSlots(workSlotsJson, {
        startedAt: row.startedAt,
        endedAt: row.endedAt,
      }),
    })),
  });
}
