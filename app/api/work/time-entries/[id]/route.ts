import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { timeEntries, timeEntryAuditLogs } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { canViewCompanyDashboard } from "@/server/auth/permissions";
import { db } from "@/server/db/client";
import { createId } from "@/server/ids";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type UpdateTimeEntryBody = {
  outputSummary?: string;
  taskTitle?: string;
  totalSeconds?: number;
};

export async function PATCH(request: Request, context: RouteParams) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as UpdateTimeEntryBody | null;
  const taskTitle = body?.taskTitle?.trim();
  const outputSummary = body?.outputSummary?.trim();
  const totalSeconds = Number(body?.totalSeconds);

  if (!taskTitle || !outputSummary) {
    return NextResponse.json({ error: "Task and output summary are required." }, { status: 400 });
  }

  if (!Number.isInteger(totalSeconds) || totalSeconds < 1 || totalSeconds > 24 * 60 * 60) {
    return NextResponse.json({ error: "Time must be between 1 second and 24 hours." }, { status: 400 });
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
  const updatedEntry = {
    ...entry,
    taskTitle,
    outputSummary,
    totalSeconds,
    updatedAt: now,
  };

  await db.transaction(async (tx) => {
    await tx
      .update(timeEntries)
      .set({
        taskTitle,
        outputSummary,
        totalSeconds,
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
      totalSeconds,
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
