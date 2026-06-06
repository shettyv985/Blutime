import { and, eq, inArray } from "drizzle-orm";

import { activeTimers } from "@/db/schema";
import { db } from "@/server/db/client";

export const maxTimerSeconds = 4 * 60 * 60;

export async function autoPauseOverlongTimers(userId?: string) {
  const timers = await db
    .select()
    .from(activeTimers)
    .where(
      userId
        ? and(inArray(activeTimers.status, ["running", "paused"]), eq(activeTimers.userId, userId))
        : inArray(activeTimers.status, ["running", "paused"])
    );
  const now = new Date();
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const pausedTimerIds: string[] = [];

  for (const timer of timers) {
    if (timer.status === "paused") {
      if (timer.elapsedBeforePauseSeconds <= maxTimerSeconds) continue;

      await db
        .update(activeTimers)
        .set({
          elapsedBeforePauseSeconds: maxTimerSeconds,
          lastHeartbeatAt: nowIso,
          updatedAt: nowIso,
        })
        .where(and(eq(activeTimers.id, timer.id), eq(activeTimers.status, "paused")));
      continue;
    }

    if (!timer.runningSince) continue;

    const runningSinceMs = new Date(timer.runningSince).getTime();
    if (Number.isNaN(runningSinceMs)) continue;

    const continuousSeconds = Math.max(0, Math.floor((nowMs - runningSinceMs) / 1000));
    const totalSeconds = timer.elapsedBeforePauseSeconds + continuousSeconds;
    if (totalSeconds < maxTimerSeconds) continue;

    await db
      .update(activeTimers)
      .set({
        status: "paused",
        runningSince: null,
        elapsedBeforePauseSeconds: maxTimerSeconds,
        lastHeartbeatAt: nowIso,
        updatedAt: nowIso,
      })
      .where(and(eq(activeTimers.id, timer.id), eq(activeTimers.status, "running")));

    pausedTimerIds.push(timer.id);
  }

  return pausedTimerIds;
}
