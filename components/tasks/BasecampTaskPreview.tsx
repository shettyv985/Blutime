"use client";

import { useEffect, useState } from "react";

type BasecampTask = {
  id: string;
  title: string;
  appUrl: string | null;
  dueOn: string | null;
  projectName: string;
  parentTitle: string | null;
  isChild: boolean;
  overdue: boolean;
};

function taskToneClass(task: BasecampTask) {
  return task.overdue ? "task-tone-overdue" : "task-tone-today";
}

function taskStatusClass(task: BasecampTask) {
  return task.overdue ? "task-status-overdue" : "task-status-today";
}

export function BasecampTaskPreview({ hasBasecampId }: { hasBasecampId: boolean }) {
  const [tasks, setTasks] = useState<BasecampTask[]>([]);
  const [loading, setLoading] = useState(hasBasecampId);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!hasBasecampId) {
      setMessage("No Basecamp person ID is mapped to this login.");
      return;
    }

    let cancelled = false;

    async function loadTasks() {
      setLoading(true);
      const response = await fetch("/api/basecamp/tasks");
      const payload = (await response.json().catch(() => null)) as {
        tasks?: BasecampTask[];
        error?: string;
        warning?: string;
      } | null;

      if (cancelled) return;

      setLoading(false);
      setTasks(payload?.tasks ?? []);
      setMessage(payload?.error ?? payload?.warning ?? "");
    }

    loadTasks();

    return () => {
      cancelled = true;
    };
  }, [hasBasecampId]);

  return (
    <section className="card mt-5 p-6 sm:p-8">
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

      {!loading && !message && tasks.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No due today or overdue Basecamp tasks found.</p>
      ) : null}

      <div className="mt-4 grid gap-3">
        {tasks.map((task) => (
          <article key={task.id} className={`border border-[var(--border)] p-5 ${taskToneClass(task)}`}>
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
            {task.appUrl ? (
              <a
                href={task.appUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block rounded-full border border-[var(--border)] px-4 py-2 text-sm"
              >
                Open in Basecamp
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
