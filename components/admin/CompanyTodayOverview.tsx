"use client";

import { useEffect, useState } from "react";

import { LinkifiedText } from "@/components/LinkifiedText";

type ActiveWork = {
  id: string;
  userName: string;
  clientName: string;
  categoryName: string;
  taskTitle: string;
  basecampTaskUrl: string | null;
  startedAt: string;
  status: string;
  elapsedSeconds: number;
};

type TodayLog = {
  id: string;
  userName: string;
  clientName: string;
  categoryName: string;
  taskTitle: string;
  basecampTaskUrl: string | null;
  outputSummary: string;
  nokkScore: number | null;
  startedAt: string;
  endedAt: string;
  totalSeconds: number;
};

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAverageScore(logs: TodayLog[]) {
  const scoredLogs = logs.filter((log) => log.nokkScore !== null);
  if (scoredLogs.length === 0) return "NA";

  const sum = scoredLogs.reduce((total, log) => total + (log.nokkScore ?? 0), 0);
  return `${(sum / scoredLogs.length).toFixed(1)}/10`;
}

function formatNokkScore(value: number | null) {
  return value === null ? "NOKK NA" : `NOKK ${value}/10`;
}

function BasecampTaskButton({ href }: { href: string | null }) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex max-w-full items-center justify-center rounded-full border border-[var(--border)] px-4 py-2 text-sm"
    >
      Open in Basecamp task
    </a>
  );
}

export function CompanyTodayOverview({
  activeWork,
  todayLogs,
}: {
  activeWork: ActiveWork[];
  todayLogs: TodayLog[];
}) {
  const [tick, setTick] = useState(0);
  const [deletedTimerIds, setDeletedTimerIds] = useState<string[]>([]);
  const [deletingTimerId, setDeletingTimerId] = useState<string | null>(null);
  const [timerMessage, setTimerMessage] = useState("");
  const visibleActiveWork = activeWork.filter((item) => !deletedTimerIds.includes(item.id));

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  async function deleteActiveTimer(item: ActiveWork) {
    const confirmed = window.confirm(
      `Delete ${item.userName}'s active timer for "${item.taskTitle}"? This will also remove it from the employee's timer panel.`
    );
    if (!confirmed) return;

    setDeletingTimerId(item.id);
    setTimerMessage("");

    const response = await fetch(`/api/work/timers/${item.id}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setDeletingTimerId(null);

    if (!response.ok) {
      setTimerMessage(payload?.error ?? "Could not delete the active timer.");
      return;
    }

    setDeletedTimerIds((current) => [...current, item.id]);
    setTimerMessage(`${item.userName}'s timer was deleted.`);
    window.dispatchEvent(new CustomEvent("blu-time:timer-deleted", { detail: { timerId: item.id } }));
  }

  return (
    <section className="card module-theme-panel mt-5 p-4 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">company today</p>
          <h2 className="mt-2 text-3xl font-normal sm:text-4xl">Active work</h2>
          <p className="mt-2 text-base text-muted">Active work and saved logs for today.</p>
        </div>
        <div className="w-full rounded-full border border-[var(--border)] px-4 py-2 text-center text-sm text-muted sm:w-auto sm:text-base">
          {visibleActiveWork.length} active / {todayLogs.length} logs / Avg NOKK {formatAverageScore(todayLogs)}
        </div>
      </div>

      {timerMessage ? <p className="mt-3 text-sm text-muted">{timerMessage}</p> : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <h3 className="text-2xl font-normal">Active timers</h3>
          <div className="mt-3 grid gap-3">
            {visibleActiveWork.length === 0 ? <p className="text-base text-muted">No one is tracking right now.</p> : null}
            {visibleActiveWork.map((item) => (
              <article key={item.id} className="module-theme-item min-w-0 border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-4 sm:p-5">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-base text-[var(--foreground)]">{item.userName}</p>
                    <p className="text-base text-muted">
                      {item.clientName} / {item.categoryName}
                    </p>
                    <h4 className="mt-1 break-words text-xl font-normal">{item.taskTitle}</h4>
                    <p className="mt-2 text-sm text-muted">Started {formatDateTime(item.startedAt)}</p>
                    <div className="flex flex-wrap gap-2">
                      <BasecampTaskButton href={item.basecampTaskUrl} />
                      <button
                        type="button"
                        onClick={() => void deleteActiveTimer(item)}
                        disabled={deletingTimerId === item.id}
                        className="mt-3 inline-flex items-center justify-center rounded-full border border-[var(--danger-border)] px-4 py-2 text-sm text-[var(--danger)] disabled:opacity-50"
                      >
                        {deletingTimerId === item.id ? "Deleting..." : "Delete timer"}
                      </button>
                    </div>
                  </div>
                  <div className="shrink-0 self-start text-left sm:text-right">
                    <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">{item.status}</p>
                    <strong className="font-mono text-xl font-normal tabular-nums">
                      {formatDuration(item.elapsedSeconds + (item.status === "running" ? tick : 0))}
                    </strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="text-2xl font-normal">Today logs</h3>
          <div className="mt-3 grid gap-3 lg:max-h-[520px] lg:overflow-auto lg:pr-1">
            {todayLogs.length === 0 ? <p className="text-base text-muted">No saved logs today.</p> : null}
            {todayLogs.map((log) => (
              <article key={log.id} className="module-theme-item min-w-0 border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-4 sm:p-5">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-base text-[var(--foreground)]">{log.userName}</p>
                    <p className="text-base text-muted">
                      {log.clientName} / {log.categoryName}
                    </p>
                    <h4 className="mt-1 break-words text-xl font-normal">{log.taskTitle}</h4>
                    <p className="mt-2 text-sm text-muted">
                      {formatDateTime(log.startedAt)} - {formatDateTime(log.endedAt)}
                    </p>
                    <BasecampTaskButton href={log.basecampTaskUrl} />
                  </div>
                  <div className="grid shrink-0 self-start justify-items-start gap-2 sm:justify-items-end">
                    <strong className="font-mono text-xl font-normal tabular-nums">{formatDuration(log.totalSeconds)}</strong>
                    <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-muted">
                      {formatNokkScore(log.nokkScore)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 break-words text-base">
                  <LinkifiedText text={log.outputSummary} />
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
