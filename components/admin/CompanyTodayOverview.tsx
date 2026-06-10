"use client";

import { useEffect, useState } from "react";

import { LinkifiedText } from "@/components/LinkifiedText";

type ActiveWork = {
  id: string;
  userName: string;
  clientName: string;
  categoryName: string;
  taskTitle: string;
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

export function CompanyTodayOverview({
  activeWork,
  todayLogs,
}: {
  activeWork: ActiveWork[];
  todayLogs: TodayLog[];
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="card module-theme-panel mt-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">company today</p>
          <h2 className="mt-2 text-4xl font-normal">Active work</h2>
          <p className="mt-2 text-base text-muted">Active work and saved logs for today.</p>
        </div>
        <div className="rounded-full border border-[var(--border)] px-4 py-2 text-base text-muted">
          {activeWork.length} active / {todayLogs.length} logs / Avg NOKK {formatAverageScore(todayLogs)}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-2xl font-normal">Active timers</h3>
          <div className="mt-3 grid gap-3">
            {activeWork.length === 0 ? <p className="text-base text-muted">No one is tracking right now.</p> : null}
            {activeWork.map((item) => (
              <article key={item.id} className="module-theme-item border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base text-[var(--foreground)]">{item.userName}</p>
                    <p className="text-base text-muted">
                      {item.clientName} / {item.categoryName}
                    </p>
                    <h4 className="mt-1 text-xl font-normal">{item.taskTitle}</h4>
                    <p className="mt-2 text-sm text-muted">Started {formatDateTime(item.startedAt)}</p>
                  </div>
                  <div className="text-right">
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

        <div>
          <h3 className="text-2xl font-normal">Today logs</h3>
          <div className="mt-3 grid max-h-[520px] gap-3 overflow-auto pr-1">
            {todayLogs.length === 0 ? <p className="text-base text-muted">No saved logs today.</p> : null}
            {todayLogs.map((log) => (
              <article key={log.id} className="module-theme-item border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base text-[var(--foreground)]">{log.userName}</p>
                    <p className="text-base text-muted">
                      {log.clientName} / {log.categoryName}
                    </p>
                    <h4 className="mt-1 text-xl font-normal">{log.taskTitle}</h4>
                    <p className="mt-2 text-sm text-muted">
                      {formatDateTime(log.startedAt)} - {formatDateTime(log.endedAt)}
                    </p>
                  </div>
                  <div className="grid justify-items-end gap-2">
                    <strong className="font-mono text-xl font-normal tabular-nums">{formatDuration(log.totalSeconds)}</strong>
                    <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-muted">
                      {formatNokkScore(log.nokkScore)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-base">
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
