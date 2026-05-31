"use client";

import { useEffect, useMemo, useState } from "react";

type Category = { id: string; name: string };
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
  startedAt: string;
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

function taskToneClass(task: BasecampTask) {
  return task.overdue ? "task-tone-overdue" : "task-tone-today";
}

function taskStatusClass(task: BasecampTask) {
  return task.overdue ? "task-status-overdue" : "task-status-today";
}

function taskStatusLabel(task: BasecampTask) {
  return task.overdue ? "Overdue" : "Due today";
}

export function EmployeeTimerPanel({
  hasBasecampId,
  showRecentLogs = true,
}: {
  hasBasecampId: boolean;
  showRecentLogs?: boolean;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<BasecampTask[]>([]);
  const [activeTimers, setActiveTimers] = useState<ActiveTimer[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [unplanned, setUnplanned] = useState(false);
  const [unplannedTask, setUnplannedTask] = useState("");
  const [unplannedClient, setUnplannedClient] = useState("");
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(0);
  const [stateLoadedAtMs, setStateLoadedAtMs] = useState(0);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );
  const overdueCount = tasks.filter((task) => task.overdue).length;
  const dueTodayCount = tasks.length - overdueCount;

  async function loadState(options: { silent?: boolean } = {}) {
    if (!options.silent) setLoading(true);
    const response = await fetch("/api/work/timer-state", { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as {
      categories?: Category[];
      basecampTasks?: BasecampTask[];
      activeTimers?: ActiveTimer[];
      timeEntries?: TimeEntry[];
      error?: string;
    } | null;

    if (!options.silent) setLoading(false);
    if (!options.silent || payload?.error) setMessage(payload?.error ?? "");
    setCategories(payload?.categories ?? []);
    setTasks(payload?.basecampTasks ?? []);
    setActiveTimers(payload?.activeTimers ?? []);
    setTimeEntries(payload?.timeEntries ?? []);
    setCategoryId((current) => current || payload?.categories?.[0]?.id || "");
    setStateLoadedAtMs(Date.now());
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
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  async function startTimer() {
    setMessage("");
    const categoryPayload =
      categoryId === "__custom__"
        ? { categoryId: "__custom__", categoryName: customCategoryName.trim() }
        : { categoryId };

    const body = unplanned
      ? {
          taskSource: "unplanned",
          taskTitle: unplannedTask,
          clientName: unplannedClient,
          ...categoryPayload,
        }
      : selectedTask
        ? {
            taskSource: "basecamp",
            taskTitle: selectedTask.title,
            clientName: selectedTask.projectName,
            ...categoryPayload,
            basecampProjectId: selectedTask.projectId,
            basecampTaskId: selectedTask.id,
            basecampTaskUrl: selectedTask.appUrl,
            basecampParentId: selectedTask.parentId,
            basecampParentTitle: selectedTask.parentTitle,
            basecampDueOn: selectedTask.dueOn,
          }
        : null;

    if (!body) {
      setMessage("Select a task first.");
      return;
    }

    const response = await fetch("/api/work/timers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setMessage(payload?.error ?? "Could not start timer.");
      return;
    }

    setSelectedTaskId("");
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
    <section className="card mt-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">work timer</p>
          <h2 className="mt-2 text-4xl font-normal">Timer</h2>
          <p className="mt-2 text-base text-muted">Pick a task, choose category, then track work.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border px-3 py-2 task-status-overdue">{overdueCount} overdue</span>
          <span className="rounded-full border px-3 py-2 task-status-today">{dueTodayCount} today</span>
          <span className="rounded-full border border-[var(--border)] px-3 py-2 text-muted">
            {activeTimers.length} active
          </span>
        </div>
      </div>

      {message ? <p className="mt-3 text-sm text-red-600">{message}</p> : null}
      {loading ? <p className="mt-3 text-sm text-muted">Loading timer data...</p> : null}

      <div className="mt-6 grid gap-3 lg:grid-cols-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:col-span-4">
          <button
  type="button"
  aria-pressed={!unplanned}
  onClick={() => setUnplanned(false)}
  style={
    !unplanned
      ? {
          borderColor: "var(--accent-sunset)",
          backgroundColor: "var(--accent-sunset-soft)",
          color: "var(--accent-sunset)",
        }
      : {
          borderColor: "var(--border)",
          backgroundColor: "transparent",
          color: "var(--foreground)",
        }
  }
  className="border px-5 py-3 text-left text-base"
>
  Basecamp task
</button>
<button
  type="button"
  aria-pressed={unplanned}
  onClick={() => setUnplanned(true)}
  style={
    unplanned
      ? {
          borderColor: "var(--accent-sunset)",
          backgroundColor: "var(--accent-sunset-soft)",
          color: "var(--accent-sunset)",
        }
      : {
          borderColor: "var(--border)",
          backgroundColor: "transparent",
          color: "var(--foreground)",
        }
  }
  className="border px-5 py-3 text-left text-base"
>
  Unplanned task
</button>
        </div>

        {unplanned ? (
          <>
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
          </>
        ) : (
          <div className="grid gap-3 lg:col-span-3">
            <select
              value={selectedTaskId}
              onChange={(event) => setSelectedTaskId(event.target.value)}
              disabled={!hasBasecampId}
              className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
            >
              <option value="">{hasBasecampId ? "Select Basecamp task" : "No Basecamp ID mapped"}</option>
              {tasks.map((task) => (
                <option
                  key={task.id}
                  value={task.id}
                  style={{
                    backgroundColor: "#191919",
                    color: task.overdue ? "#FF7A17" : "#A0C3EC",
                  }}
                >
                  {taskStatusLabel(task)} - {task.projectName} - {task.isChild ? "Step: " : ""}
                  {task.title}
                </option>
              ))}
            </select>

            {selectedTask ? (
              <div className={`border p-4 ${taskToneClass(selectedTask)}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs ${taskStatusClass(selectedTask)}`}>
                    {taskStatusLabel(selectedTask)}
                  </span>
                  <span className="text-sm text-muted">{selectedTask.projectName}</span>
                  {selectedTask.dueOn ? <span className="text-sm text-muted">{selectedTask.dueOn}</span> : null}
                </div>
                <p className="mt-2 text-lg text-[var(--foreground)]">{selectedTask.title}</p>
                {selectedTask.parentTitle ? <p className="mt-1 text-sm text-muted">{selectedTask.parentTitle}</p> : null}
              </div>
            ) : null}
          </div>
        )}

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
        {activeTimers.length === 0 ? <p className="text-sm text-muted">No active timers.</p> : null}
        {activeTimers.map((timer) => (
          <article
            key={timer.id}
            className={`border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-5 ${
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
            <article key={entry.id} className="border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-5">
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
