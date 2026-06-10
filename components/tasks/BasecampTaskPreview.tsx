"use client";

import { useEffect, useState } from "react";

type BasecampTask = {
  id: string;
  title: string;
  appUrl: string | null;
  dueOn: string | null;
  projectId: string | null;
  projectName: string;
  parentId: string | null;
  parentTitle: string | null;
  isChild: boolean;
  overdue: boolean;
};

type ActiveTimer = {
  id: string;
  clientName: string;
  categoryName: string;
  taskTitle: string;
  taskSource: string;
  status: string;
  elapsedSeconds: number;
};

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function taskToneClass(task: BasecampTask) {
  return task.overdue ? "task-tone-overdue" : "task-tone-today";
}

function taskStatusClass(task: BasecampTask) {
  return task.overdue ? "task-status-overdue" : "task-status-today";
}

export function BasecampTaskPreview({ hasBasecampId }: { hasBasecampId: boolean }) {
  const [tasks, setTasks] = useState<BasecampTask[]>([]);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);
  const [busyTimerId, setBusyTimerId] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [nokkScores, setNokkScores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(hasBasecampId);
  const [message, setMessage] = useState("");
  const [timerMessage, setTimerMessage] = useState("");
  const [nowMs, setNowMs] = useState(0);
  const [stateLoadedAtMs, setStateLoadedAtMs] = useState(0);

  async function loadState(options: { silent?: boolean } = {}) {
    if (!hasBasecampId) {
      setLoading(false);
      setMessage("No Basecamp person ID is mapped to this login.");
      return;
    }

    if (!options.silent) setLoading(true);
    const response = await fetch("/api/work/timer-state", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as {
      basecampTasks?: BasecampTask[];
      activeTimers?: ActiveTimer[];
      error?: string;
      warning?: string;
    } | null;

    if (!options.silent) setLoading(false);
    setTasks(payload?.basecampTasks ?? []);
    setActiveTimers(payload?.activeTimers ?? []);
    setStateLoadedAtMs(Date.now());
    setMessage(payload?.error ?? payload?.warning ?? "");
  }

  useEffect(() => {
    void loadState();
  }, [hasBasecampId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadState({ silent: true });
    }, 15000);

    return () => window.clearInterval(interval);
  }, [hasBasecampId]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  function activeTimerForTask(task: BasecampTask) {
    return activeTimers.find(
      (timer) =>
        timer.taskSource === "basecamp" &&
        timer.taskTitle === task.title &&
        timer.clientName === task.projectName
    );
  }

  function timerElapsed(timer: ActiveTimer) {
    return (
      timer.elapsedSeconds +
      (timer.status === "running" ? Math.max(0, Math.floor((nowMs - stateLoadedAtMs) / 1000)) : 0)
    );
  }

  async function startTimer(task: BasecampTask) {
    setTimerMessage("");
    setStartingTaskId(task.id);

    const response = await fetch("/api/work/timers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskSource: "basecamp",
        taskTitle: task.title,
        clientName: task.projectName,
        categoryName: "Basecamp task",
        basecampProjectId: task.projectId,
        basecampTaskId: task.id,
        basecampTaskUrl: task.appUrl,
        basecampParentId: task.parentId,
        basecampParentTitle: task.parentTitle,
        basecampDueOn: task.dueOn,
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    setStartingTaskId(null);

    if (!response.ok) {
      setTimerMessage(payload?.error ?? "Could not start timer.");
      return;
    }

    setTimerMessage(`Timer started for ${task.title}.`);
    await loadState({ silent: true });
    window.dispatchEvent(new CustomEvent("blu-time:timer-started"));
  }

  async function timerAction(timerId: string, action: "pause" | "resume") {
    setBusyTimerId(timerId);
    await fetch(`/api/work/timers/${timerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyTimerId(null);
    await loadState({ silent: true });
  }

  async function stopTimer(timerId: string) {
    const outputSummary = outputs[timerId]?.trim();
    if (!outputSummary) {
      setTimerMessage("Paste the output before stopping this timer.");
      return;
    }

    setTimerMessage("");
    setBusyTimerId(timerId);
    const response = await fetch(`/api/work/timers/${timerId}/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outputSummary, nokkScore: nokkScores[timerId] ?? "NA" }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setBusyTimerId(null);

    if (!response.ok) {
      setTimerMessage(payload?.error ?? "Could not stop timer.");
      return;
    }

    setOutputs((current) => {
      const next = { ...current };
      delete next[timerId];
      return next;
    });
    setNokkScores((current) => {
      const next = { ...current };
      delete next[timerId];
      return next;
    });
    setTimerMessage("Timer saved.");
    await loadState({ silent: true });
    window.dispatchEvent(new CustomEvent("blu-time:timer-started"));
  }

  return (
    <section className="card module-theme-panel mt-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase text-muted">basecamp</p>
          <h2 className="mt-2 text-4xl font-normal">Tasks</h2>
          <p className="mt-2 text-base text-muted">Due today and overdue tasks for the signed-in user.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border px-3 py-2 task-status-overdue">
            {tasks.filter((task) => task.overdue).length} overdue
          </span>
          <span className="rounded-full border px-3 py-2 task-status-today">
            {tasks.filter((task) => !task.overdue).length} today
          </span>
        </div>
      </div>

      {loading ? <p className="mt-4 text-sm text-muted">Loading Basecamp tasks...</p> : null}
      {message ? <p className="mt-4 text-sm text-muted">{message}</p> : null}
      {timerMessage ? <p className="mt-4 text-sm text-muted">{timerMessage}</p> : null}

      {!loading && !message && tasks.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No due today or overdue Basecamp tasks found.</p>
      ) : null}

      <div className="mt-4 grid gap-3">
        {tasks.map((task) => {
          const activeTimer = activeTimerForTask(task);

          return (
            <article key={task.id} className={`module-theme-item border border-[var(--border)] p-5 ${taskToneClass(task)}`}>
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{task.projectName}</span>
                    {task.dueOn ? (
                      <span className={`rounded-full border px-2 py-1 ${taskStatusClass(task)}`}>
                        {task.overdue ? "Overdue" : "Due today"}: {task.dueOn}
                      </span>
                    ) : null}
                    {task.isChild ? <span>Child step</span> : null}
                  </div>
                  <h3 className="mt-3 text-2xl font-normal">{task.title}</h3>
                  {task.parentTitle ? <p className="mt-1 text-sm text-muted">{task.parentTitle}</p> : null}
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {activeTimer ? (
                    <span className="rounded-full border border-[var(--border)] px-4 py-2 font-mono text-sm tabular-nums text-muted">
                      {activeTimer.status} / {formatDuration(timerElapsed(activeTimer))}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startTimer(task)}
                      disabled={startingTaskId === task.id}
                      className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
                    >
                      {startingTaskId === task.id ? "Starting..." : "Start timer"}
                    </button>
                  )}
                  {task.appUrl ? (
                    <a
                      href={task.appUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block rounded-full border border-[var(--border)] px-4 py-2 text-sm"
                    >
                      Open
                    </a>
                  ) : null}
                </div>
              </div>

              {activeTimer ? (
                <div className="mt-4 grid gap-3">
                  <textarea
                    value={outputs[activeTimer.id] ?? ""}
                    onChange={(event) =>
                      setOutputs((current) => ({ ...current, [activeTimer.id]: event.target.value }))
                    }
                    placeholder="Paste output / summary here"
                    className="min-h-24 w-full border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                  />
                  <div className="flex flex-wrap items-end gap-2">
                    {activeTimer.status === "running" ? (
                      <button
                        type="button"
                        onClick={() => timerAction(activeTimer.id, "pause")}
                        disabled={busyTimerId === activeTimer.id}
                        className="rounded-full border border-[var(--border)] px-5 py-2 text-sm disabled:opacity-50"
                      >
                        Pause
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => timerAction(activeTimer.id, "resume")}
                        disabled={busyTimerId === activeTimer.id}
                        className="rounded-full border border-[var(--border)] px-5 py-2 text-sm disabled:opacity-50"
                      >
                        Resume
                      </button>
                    )}
                    <label className="grid gap-1 text-xs text-muted">
                      Add your NOKK score
                      <select
                        value={nokkScores[activeTimer.id] ?? "NA"}
                        onChange={(event) =>
                          setNokkScores((current) => ({ ...current, [activeTimer.id]: event.target.value }))
                        }
                        className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--foreground)]"
                      >
                        <option value="NA">NA</option>
                        {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
                          <option key={score} value={String(score)}>
                            {score}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => stopTimer(activeTimer.id)}
                      disabled={busyTimerId === activeTimer.id}
                      className="rounded-full bg-[var(--primary)] px-5 py-2 text-sm text-[var(--primary-foreground)] disabled:opacity-50"
                    >
                      Stop and save
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
