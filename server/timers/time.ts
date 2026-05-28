import type { ActiveTimer } from "@/db/schema";

export function elapsedSeconds(timer: Pick<ActiveTimer, "elapsedBeforePauseSeconds" | "runningSince">) {
  if (!timer.runningSince) return timer.elapsedBeforePauseSeconds;

  const runningSinceMs = new Date(timer.runningSince).getTime();
  const nowMs = Date.now();

  if (Number.isNaN(runningSinceMs)) return timer.elapsedBeforePauseSeconds;

  return timer.elapsedBeforePauseSeconds + Math.max(0, Math.floor((nowMs - runningSinceMs) / 1000));
}

