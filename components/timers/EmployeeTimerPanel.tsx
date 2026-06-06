"use client";

import { useEffect, useRef, useState } from "react";

type Category = { id: string; name: string };
type ActiveTimer = {
  id: string;
  clientName: string;
  categoryName: string;
  taskTitle: string;
  taskSource: string;
  startedAt: string;
  runningSince: string | null;
  status: string;
  elapsedSeconds: number;
};
type TimeEntry = {
  id: string;
  clientName: string;
  categoryName: string;
  taskTitle: string;
  outputSummary: string;
  simultaneousNote: string | null;
  totalSeconds: number;
};

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, index) =>
    part.startsWith("http") ? (
      <a key={index} href={part} target="_blank" rel="noreferrer" className="text-[var(--primary)]">
        {part}
      </a>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

export function EmployeeTimerPanel({
  showRecentLogs = true,
}: {
  hasBasecampId: boolean;
  showRecentLogs?: boolean;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [unplannedTask, setUnplannedTask] = useState("");
  const [unplannedClient, setUnplannedClient] = useState("");
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(0);
  const [stateLoadedAtMs, setStateLoadedAtMs] = useState(0);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const notifiedHoursRef = useRef<Record<string, number>>({});
  const autoPauseRunKeysRef = useRef(new Set<string>());
  const unplannedTimers = activeTimers.filter((timer) => timer.taskSource !== "basecamp");

  async function loadState(options: { silent?: boolean } = {}) {
    if (!options.silent) setLoading(true);
    const response = await fetch("/api/work/timer-state", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as {
      categories?: Category[];
      activeTimers?: ActiveTimer[];
      timeEntries?: TimeEntry[];
      autoPausedTimerIds?: string[];
      error?: string;
    } | null;

    if (!options.silent) setLoading(false);
    if (!options.silent || payload?.error) setMessage(payload?.error ?? "");
    setCategories(payload?.categories ?? []);
    setActiveTimers(payload?.activeTimers ?? []);
    setTimeEntries(payload?.timeEntries ?? []);
    setCategoryId((current) => current || payload?.categories?.[0]?.id || "");
    setStateLoadedAtMs(Date.now());
    if (payload?.autoPausedTimerIds?.length) {
      setMessage(`${payload.autoPausedTimerIds.length} timer${payload.autoPausedTimerIds.length === 1 ? "" : "s"} automatically paused after running for 4 hours.`);
    }
  }

  useEffect(() => {
    void loadState();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadState({ silent: true });
    }, 15000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void loadState({ silent: true });
      }
    }

    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, []);

  useEffect(() => {
    function refreshAfterExternalStart() {
      void loadState({ silent: true });
    }

    window.addEventListener("blu-time:timer-started", refreshAfterExternalStart);
    return () => window.removeEventListener("blu-time:timer-started", refreshAfterExternalStart);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setNotificationPermission("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  useEffect(() => {
    if (!nowMs || !stateLoadedAtMs) return;

    for (const timer of activeTimers) {
      if (timer.status !== "running") continue;

      const elapsed = timer.elapsedSeconds + Math.max(0, Math.floor((nowMs - stateLoadedAtMs) / 1000));
      const completedHours = Math.floor(elapsed / 3600);
      const lastNotifiedHour = notifiedHoursRef.current[timer.id] ?? 0;

      if (notificationPermission === "granted" && completedHours >= 1 && completedHours > lastNotifiedHour) {
        new Notification("BluTime timer reminder", {
          body: `${timer.taskTitle} has been running for ${completedHours} hour${completedHours === 1 ? "" : "s"}.`,
          tag: `blutime-${timer.id}-${completedHours}`,
        });
        notifiedHoursRef.current[timer.id] = completedHours;
      }

      if (elapsed < 4 * 60 * 60) continue;

      const runKey = `${timer.id}:${timer.runningSince ?? "running"}`;
      if (autoPauseRunKeysRef.current.has(runKey)) continue;
      autoPauseRunKeysRef.current.add(runKey);
      setMessage(`${timer.taskTitle} automatically paused after reaching 4 hours.`);
      if (notificationPermission === "granted") {
        new Notification("BluTime timer automatically paused", {
          body: `${timer.taskTitle} reached the 4-hour continuous running limit.`,
          tag: `blutime-auto-pause-${runKey}`,
        });
      }
      void timerAction(timer.id, "pause");
    }
  }, [activeTimers, notificationPermission, nowMs, stateLoadedAtMs]);

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      setMessage("Desktop notifications are not supported in this browser.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    setMessage(permission === "granted" ? "Desktop timer notifications enabled." : "Desktop notifications were not enabled.");
  }

  async function startTimer() {
    setMessage("");
    const categoryPayload =
      categoryId === "__custom__"
        ? { categoryId: "__custom__", categoryName: customCategoryName.trim() }
        : { categoryId };

    if (!unplannedTask.trim() || !unplannedClient.trim()) {
      setMessage("Task and client are required for unplanned work.");
      return;
    }

    const response = await fetch("/api/work/timers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskSource: "unplanned",
        taskTitle: unplannedTask,
        clientName: unplannedClient,
        ...categoryPayload,
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setMessage(payload?.error ?? "Could not start timer.");
      return;
    }

    setUnplannedTask("");
    setUnplannedClient("");
    setCustomCategoryName("");
    await loadState();
  }

  async function timerAction(timerId: string, action: "pause" | "resume") {
    await fetch(`/api/work/timers/${timerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await loadState();
  }

  async function stopTimer(timerId: string) {
    const outputSummary = outputs[timerId]?.trim();
    if (!outputSummary) {
      setMessage("Output / Summary is required before stopping.");
      return;
    }

    const response = await fetch(`/api/work/timers/${timerId}/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outputSummary }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setMessage(payload?.error ?? "Could not stop timer.");
      return;
    }

    setOutputs((current) => {
      const next = { ...current };
      delete next[timerId];
      return next;
    });
    await loadState();
  }

  async function deleteLog(entryId: string) {
    const confirmed = window.confirm("Delete this time log?");
    if (!confirmed) return;

    setMessage("");
    setDeletingLogId(entryId);

    const response = await fetch(`/api/work/time-entries/${entryId}`, {
      method: "DELETE",
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    setDeletingLogId(null);

    if (!response.ok) {
      setMessage(payload?.error ?? "Could not delete log.");
      return;
    }

    setTimeEntries((current) => current.filter((entry) => entry.id !== entryId));
  }

  return (
    <section className="card module-theme-panel mt-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">work timer</p>
          <h2 className="mt-2 text-4xl font-normal">Unplanned timer</h2>
          <p className="mt-2 text-base text-muted">Use this only for work that is not already listed in Basecamp.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {notificationPermission !== "granted" ? (
            <button
              type="button"
              onClick={() => void enableNotifications()}
              className="rounded-full border border-[var(--border)] px-3 py-2 text-muted"
            >
              Enable notifications
            </button>
          ) : (
            <span className="rounded-full border border-[var(--border)] px-3 py-2 text-muted">
              Notifications on
            </span>
          )}
          <span className="rounded-full border border-[var(--border)] px-3 py-2 text-muted">
            {unplannedTimers.length} active
          </span>
        </div>
      </div>

      {message ? <p className="mt-3 text-sm text-red-600">{message}</p> : null}
      {loading ? <p className="mt-3 text-sm text-muted">Loading timer data...</p> : null}

      <div className="mt-6 grid gap-3 lg:grid-cols-4">
        <input
          value={unplannedTask}
          onChange={(event) => setUnplannedTask(event.target.value)}
          placeholder="Task"
          className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3 lg:col-span-2"
        />
        <input
          value={unplannedClient}
          onChange={(event) => setUnplannedClient(event.target.value)}
          placeholder="Client / project"
          className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
        />

        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
          <option value="__custom__">Other / type category</option>
        </select>

        {categoryId === "__custom__" ? (
          <input
            value={customCategoryName}
            onChange={(event) => setCustomCategoryName(event.target.value)}
            placeholder="Type category"
            className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3 lg:col-span-4"
          />
        ) : null}

        <button
          onClick={startTimer}
          className="bg-[var(--primary)] px-5 py-3 text-base lg:col-span-4"
        >
          Start timer
        </button>
      </div>

      <div className="mt-8 grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-2xl font-normal">Running timers</h3>
          <p className="text-sm text-muted">Each timer needs its own output before stop.</p>
        </div>
        {unplannedTimers.length === 0 ? <p className="text-sm text-muted">No active unplanned timers.</p> : null}
        {unplannedTimers.map((timer) => (
          <article
            key={timer.id}
            className={`module-theme-item border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-5 ${
              timer.status === "running" ? "timer-accent-running" : "timer-accent-paused"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-muted">
                    {timer.clientName}
                  </span>
                  <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-muted">
                    {timer.categoryName}
                  </span>
                  <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-muted">
                    {timer.status}
                  </span>
                </div>
                <h4 className="mt-1 text-xl font-normal">{timer.taskTitle}</h4>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs uppercase text-muted">elapsed</p>
                <div className="font-mono text-4xl tabular-nums">
                  {formatDuration(
                    timer.elapsedSeconds +
                      (timer.status === "running"
                        ? Math.max(0, Math.floor((nowMs - stateLoadedAtMs) / 1000))
                        : 0)
                  )}
                </div>
              </div>
            </div>
            <textarea
              value={outputs[timer.id] ?? ""}
              onChange={(event) => setOutputs((current) => ({ ...current, [timer.id]: event.target.value }))}
              placeholder="Output / Summary"
              className="mt-4 min-h-24 w-full border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {timer.status === "running" ? (
                <button onClick={() => timerAction(timer.id, "pause")} className="border border-[var(--border)] px-5 py-2">
                  Pause
                </button>
              ) : (
                <button onClick={() => timerAction(timer.id, "resume")} className="border border-[var(--border)] px-5 py-2">
                  Resume
                </button>
              )}
              <button onClick={() => stopTimer(timer.id)} className="bg-[var(--primary)] px-5 py-2">
                Stop and save
              </button>
            </div>
          </article>
        ))}
      </div>

      {showRecentLogs ? (
        <div className="mt-8 grid gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 className="text-2xl font-normal">Recent logs</h3>
            <p className="text-sm text-muted">{timeEntries.length} saved logs</p>
          </div>
          {timeEntries.map((entry) => (
            <article key={entry.id} className="module-theme-item border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted">
                    {entry.clientName} / {entry.categoryName}
                  </p>
                  <h4 className="mt-1 text-xl font-normal">{entry.taskTitle}</h4>
                </div>
                <div className="flex items-center gap-3">
                  <strong className="font-mono text-lg font-normal">{formatDuration(entry.totalSeconds)}</strong>
                  <button
                    onClick={() => deleteLog(entry.id)}
                    disabled={deletingLogId === entry.id}
                    className="border border-[var(--danger-border)] px-3 py-1 text-xs text-[var(--danger)] disabled:opacity-60"
                  >
                    {deletingLogId === entry.id ? "Deleting" : "Delete"}
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm">{linkify(entry.outputSummary)}</p>
              {entry.simultaneousNote ? <p className="mt-2 text-xs text-muted">{entry.simultaneousNote}</p> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
