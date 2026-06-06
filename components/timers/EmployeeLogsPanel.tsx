"use client";

import { useEffect, useRef, useState } from "react";

import { LinkifiedText } from "@/components/LinkifiedText";

type TimeEntry = {
  id: string;
  clientName: string;
  categoryName: string;
  taskTitle: string;
  outputSummary: string;
  simultaneousNote: string | null;
  startedAt: string;
  endedAt: string;
  totalSeconds: number;
};

type EditLogDraft = {
  outputSummary: string;
  taskTitle: string;
  totalMinutes: string;
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

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function weekAgoKey() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
}

export function EmployeeLogsPanel() {
  const reportRef = useRef<HTMLElement | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [startDate, setStartDate] = useState(weekAgoKey());
  const [endDate, setEndDate] = useState(todayKey());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [savingLogId, setSavingLogId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditLogDraft | null>(null);
  const totalSeconds = timeEntries.reduce((sum, entry) => sum + entry.totalSeconds, 0);

  async function loadLogs(options: { silent?: boolean } = {}) {
    if (!options.silent) setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);

    const response = await fetch(`/api/work/time-entries?${params.toString()}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as {
      timeEntries?: TimeEntry[];
      error?: string;
    } | null;

    if (!options.silent) setLoading(false);

    if (!response.ok || !payload) {
      setMessage(payload?.error ?? "Could not load logs.");
      return;
    }

    setMessage("");
    setTimeEntries(payload.timeEntries ?? []);
  }

  useEffect(() => {
    void loadLogs();
  }, [endDate, startDate]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadLogs({ silent: true });
    }, 15000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void loadLogs({ silent: true });
      }
    }

    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, []);

  async function deleteLog(entryId: string) {
    const confirmed = window.confirm("Delete this time log?");
    if (!confirmed) return;

    setMessage("");
    setDeletingLogId(entryId);

    const response = await fetch(`/api/work/time-entries/${entryId}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    setDeletingLogId(null);

    if (!response.ok) {
      setMessage(payload?.error ?? "Could not delete log.");
      return;
    }

    setTimeEntries((current) => current.filter((entry) => entry.id !== entryId));
  }

  function startEditing(entry: TimeEntry) {
    setMessage("");
    setEditingLogId(entry.id);
    setEditDraft({
      outputSummary: entry.outputSummary,
      taskTitle: entry.taskTitle,
      totalMinutes: String(Math.max(1, Math.round(entry.totalSeconds / 60))),
    });
  }

  function cancelEditing() {
    setEditingLogId(null);
    setEditDraft(null);
  }

  async function saveLog(entryId: string) {
    if (!editDraft) return;

    const totalMinutes = Number(editDraft.totalMinutes);
    if (!editDraft.taskTitle.trim() || !editDraft.outputSummary.trim() || !Number.isFinite(totalMinutes) || totalMinutes <= 0) {
      setMessage("Task, output summary, and valid minutes are required.");
      return;
    }

    setMessage("");
    setSavingLogId(entryId);
    const response = await fetch(`/api/work/time-entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskTitle: editDraft.taskTitle,
        outputSummary: editDraft.outputSummary,
        totalSeconds: Math.round(totalMinutes * 60),
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      timeEntry?: Pick<TimeEntry, "id" | "outputSummary" | "taskTitle" | "totalSeconds">;
    } | null;
    setSavingLogId(null);

    if (!response.ok || !payload?.timeEntry) {
      setMessage(payload?.error ?? "Could not update log.");
      return;
    }

    setTimeEntries((current) =>
      current.map((entry) => (entry.id === entryId ? { ...entry, ...payload.timeEntry } : entry))
    );
    cancelEditing();
  }

  function exportLogsPdf() {
    if (!reportRef.current) return;

    const reportClone = reportRef.current.cloneNode(true) as HTMLElement;
    reportClone.querySelectorAll(".no-print").forEach((element) => element.remove());

    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);

    const printDocument = frame.contentWindow?.document;
    if (!printDocument) {
      frame.remove();
      return;
    }

    printDocument.open();
    printDocument.write(`<!doctype html>
      <html>
        <head>
          <title>BluTime employee logs</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 28px; color: #111827; font-family: Arial, sans-serif; font-size: 13px; line-height: 1.45; }
            h2 { margin: 0; font-size: 26px; }
            h3 { margin: 0; font-size: 17px; }
            p { margin: 0; }
            section, article { border: 1px solid #d1d5db; border-radius: 10px; background: #fff; }
            section { border: 0; }
            article { margin-top: 12px; padding: 14px; page-break-inside: avoid; }
            .grid { display: grid; gap: 12px; }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .justify-between { justify-content: space-between; }
            .gap-3 { gap: 12px; }
            .mt-1 { margin-top: 4px; }
            .mt-2 { margin-top: 8px; }
            .mt-3 { margin-top: 12px; }
            .mt-5 { margin-top: 20px; }
            .text-muted, .text-sm { color: #4b5563; }
            .font-mono { font-family: Consolas, monospace; }
            .font-normal { font-weight: 400; }
            .text-2xl { font-size: 22px; }
            a { color: #2563eb; }
            @page { margin: 14mm; }
          </style>
        </head>
        <body>${reportClone.innerHTML}</body>
      </html>`);
    printDocument.close();

    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  }

  return (
    <section ref={reportRef} className="card mt-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">work history</p>
          <h2 className="mt-2 text-4xl font-normal">My logs</h2>
          <p className="mt-2 text-base text-muted">Your saved work logs. Deleted logs are removed automatically.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[var(--accent-breeze)] px-3 py-2 font-mono text-sm text-[var(--accent-breeze)]">
            {formatDuration(totalSeconds)} total
          </span>
          <span className="rounded-full border border-[var(--border)] px-3 py-2 text-sm text-muted">
            {timeEntries.length} logs
          </span>
          <button
            type="button"
            onClick={exportLogsPdf}
            className="no-print border border-[var(--border-strong)] px-5 py-3 text-base"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="no-print mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
        <label className="grid gap-2 text-sm text-muted">
          From
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)]"
          />
        </label>
        <label className="grid gap-2 text-sm text-muted">
          To
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)]"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setStartDate(todayKey());
            setEndDate(todayKey());
          }}
          className="self-end border border-[var(--border)] px-5 py-3 text-base"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => {
            setStartDate("");
            setEndDate("");
          }}
          className="self-end border border-[var(--border)] px-5 py-3 text-base"
        >
          All
        </button>
      </div>

      <p className="mt-3 text-sm text-muted">
        Showing logs {startDate || "from first saved log"} to {endDate || "latest"}.
      </p>

      {loading ? <p className="mt-4 text-sm text-muted">Loading logs...</p> : null}
      {message ? <p className="mt-4 text-sm text-[var(--accent-sunset)]">{message}</p> : null}
      {!loading && timeEntries.length === 0 ? <p className="mt-4 text-sm text-muted">No saved logs yet.</p> : null}

      <div className="mt-5 grid gap-3">
        {timeEntries.map((entry) => (
          <article key={entry.id} className="border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted">
                  {entry.clientName} / {entry.categoryName}
                </p>
                <h3 className="mt-1 text-2xl font-normal">{entry.taskTitle}</h3>
                <p className="mt-2 text-sm text-muted">
                  {formatDateTime(entry.startedAt)} - {formatDateTime(entry.endedAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <strong className="font-mono text-xl font-normal">{formatDuration(entry.totalSeconds)}</strong>
                <button
                  type="button"
                  onClick={() => startEditing(entry)}
                  disabled={editingLogId === entry.id}
                  className="no-print border border-[var(--border)] px-3 py-2 text-xs disabled:opacity-60"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void deleteLog(entry.id)}
                  disabled={deletingLogId === entry.id}
                  className="no-print border border-[var(--danger-border)] px-3 py-2 text-xs text-[var(--danger)] disabled:opacity-60"
                >
                  {deletingLogId === entry.id ? "Deleting" : "Delete"}
                </button>
              </div>
            </div>
            {editingLogId === entry.id && editDraft ? (
              <div className="no-print mt-4 grid gap-3">
                <label className="grid gap-2 text-sm text-muted">
                  Task
                  <input
                    value={editDraft.taskTitle}
                    onChange={(event) => setEditDraft((current) => current ? { ...current, taskTitle: event.target.value } : current)}
                    className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)]"
                  />
                </label>
                <label className="grid gap-2 text-sm text-muted">
                  Output summary
                  <textarea
                    value={editDraft.outputSummary}
                    onChange={(event) => setEditDraft((current) => current ? { ...current, outputSummary: event.target.value } : current)}
                    className="min-h-28 border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)]"
                  />
                </label>
                <label className="grid max-w-48 gap-2 text-sm text-muted">
                  Logged minutes
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={editDraft.totalMinutes}
                    onChange={(event) => setEditDraft((current) => current ? { ...current, totalMinutes: event.target.value } : current)}
                    className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)]"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void saveLog(entry.id)}
                    disabled={savingLogId === entry.id}
                    className="border border-[var(--border-strong)] px-5 py-2 text-sm disabled:opacity-60"
                  >
                    {savingLogId === entry.id ? "Saving..." : "Save changes"}
                  </button>
                  <button type="button" onClick={cancelEditing} className="border border-[var(--border)] px-5 py-2 text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-base">
                <LinkifiedText text={entry.outputSummary} />
              </p>
            )}
            {entry.simultaneousNote ? <p className="mt-3 text-sm text-muted">{entry.simultaneousNote}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
