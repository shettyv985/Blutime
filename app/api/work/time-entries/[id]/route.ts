import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { timeEntries, timeEntryAuditLogs } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { canViewCompanyDashboard } from "@/server/auth/permissions";
import { db } from "@/server/db/client";
import { createId } from "@/server/ids";
import { normalizeWorkSlots, serializeWorkSlots } from "@/server/timers/work-slots";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type UpdateTimeEntryBody = {
  outputSummary?: string;
  endedAt?: string;
  nokkScore?: number | string | null;
  startedAt?: string;
  taskTitle?: string;
  totalSeconds?: number;
  workSlots?: unknown;
};

function parseNokkScore(value: unknown) {
  if (typeof value === "string" && value.trim().toUpperCase() === "NA") return null;
  if (value === null || value === undefined || value === "") return null;

  const score = Number(value);
  if (!Number.isInteger(score) || score < 1 || score > 10) return undefined;

  return score;
}

export async function PATCH(request: Request, context: RouteParams) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as UpdateTimeEntryBody | null;
  const taskTitle = body?.taskTitle?.trim();
  const outputSummary = body?.outputSummary?.trim();
  const nokkScore = parseNokkScore(body?.nokkScore);
  const normalizedSlots = normalizeWorkSlots(
    Array.isArray(body?.workSlots) ? body.workSlots : [{ startedAt: body?.startedAt, endedAt: body?.endedAt }]
  );

  if (!taskTitle || !outputSummary) {
    return NextResponse.json({ error: "Task and output summary are required." }, { status: 400 });
  }

  if ("error" in normalizedSlots) {
    return NextResponse.json({ error: normalizedSlots.error }, { status: 400 });
  }

  if (nokkScore === undefined) {
    return NextResponse.json({ error: "NOKK score must be NA or a number from 1 to 10." }, { status: 400 });
  }

  const [entry] = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.id, id), isNull(timeEntries.deletedAt)))
    .limit(1);

  if (!entry) {
    return NextResponse.json({ error: "Log not found." }, { status: 404 });
  }

  const canEditOtherLogs = canViewCompanyDashboard(user);
  if (entry.userId !== user.userId && !canEditOtherLogs) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { endedAt, startedAt, totalSeconds, workSlots } = normalizedSlots;
  const workSlotsJson = serializeWorkSlots(workSlots);
  const updatedEntry = {
    ...entry,
    taskTitle,
    outputSummary,
    nokkScore,
    startedAt,
    endedAt,
    totalSeconds,
    workSlotsJson,
    updatedAt: now,
  };

  await db.transaction(async (tx) => {
    await tx
      .update(timeEntries)
      .set({
        taskTitle,
        outputSummary,
        nokkScore,
        startedAt,
        endedAt,
        totalSeconds,
        workSlotsJson,
        updatedAt: now,
      })
      .where(eq(timeEntries.id, id));

    await tx.insert(timeEntryAuditLogs).values({
      id: createId(),
      timeEntryId: id,
      actorUserId: user.userId,
      action: "update",
      beforeJson: JSON.stringify(entry),
      afterJson: JSON.stringify(updatedEntry),
      createdAt: now,
    });
  });

  return NextResponse.json({
    ok: true,
    timeEntry: {
      id,
      taskTitle,
      outputSummary,
      nokkScore,
      startedAt,
      endedAt,
      totalSeconds,
      workSlots,
      updatedAt: now,
    },
  });
}

export async function DELETE(_request: Request, context: RouteParams) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [entry] = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.id, id), isNull(timeEntries.deletedAt)))
    .limit(1);

  if (!entry) {
    return NextResponse.json({ error: "Log not found." }, { status: 404 });
  }

  const canDeleteOtherLogs = canViewCompanyDashboard(user);
  if (entry.userId !== user.userId && !canDeleteOtherLogs) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    await tx
      .update(timeEntries)
      .set({
        deletedAt: now,
        deletedByUserId: user.userId,
        updatedAt: now,
      })
      .where(eq(timeEntries.id, id));

    await tx.insert(timeEntryAuditLogs).values({
      id: createId(),
      timeEntryId: id,
      actorUserId: user.userId,
      action: "delete",
      beforeJson: JSON.stringify(entry),
      afterJson: JSON.stringify({ deletedAt: now, deletedByUserId: user.userId }),
      createdAt: now,
    });
  });

  return NextResponse.json({ ok: true });
}
