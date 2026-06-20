import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { activeTimers } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { canViewCompanyDashboard } from "@/server/auth/permissions";
import { db } from "@/server/db/client";
import { autoPauseOverlongTimers } from "@/server/timers/auto-pause";
import { elapsedSeconds } from "@/server/timers/time";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteParams) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  await autoPauseOverlongTimers(user.userId);
  const [timer] = await db
    .select()
    .from(activeTimers)
    .where(and(eq(activeTimers.id, id), eq(activeTimers.userId, user.userId)))
    .limit(1);

  if (!timer) {
    return NextResponse.json({ error: "Timer not found." }, { status: 404 });
  }

  const now = new Date().toISOString();

  if (body?.action === "pause" && timer.status === "running") {
    await db
      .update(activeTimers)
      .set({
        status: "paused",
        runningSince: null,
        elapsedBeforePauseSeconds: elapsedSeconds(timer),
        updatedAt: now,
        lastHeartbeatAt: now,
      })
      .where(eq(activeTimers.id, id));
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "resume" && timer.status === "paused") {
    await db
      .update(activeTimers)
      .set({ status: "running", runningSince: now, updatedAt: now, lastHeartbeatAt: now })
      .where(eq(activeTimers.id, id));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid timer action." }, { status: 400 });
}

export async function DELETE(_request: Request, context: RouteParams) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canViewCompanyDashboard(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const [timer] = await db
    .select({ id: activeTimers.id })
    .from(activeTimers)
    .where(eq(activeTimers.id, id))
    .limit(1);

  if (!timer) {
    return NextResponse.json({ error: "Active timer not found." }, { status: 404 });
  }

  await db.delete(activeTimers).where(eq(activeTimers.id, id));

  return NextResponse.json({ ok: true, timerId: id });
}
