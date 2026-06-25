"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LinkifiedText } from "@/components/LinkifiedText";

const appTimeZone = "Asia/Kolkata";

type WorkSlot = {
  endedAt: string;
  startedAt: string;
};

type WorkSlotDraft = WorkSlot & {
  id: string;
};

type TimeEntry = {
  id: string;
  clientName: string;
  categoryName: string;
  taskTitle: string;
  outputSummary: string;
  simultaneousNote: string | null;
  nokkScore: number | null;
  startedAt: string;
  endedAt: string;
  totalSeconds: number;
  workSlots?: WorkSlot[];
};

type EditLogDraft = {
  nokkScore: string;
  outputSummary: string;
  taskTitle: string;
  workSlots: WorkSlotDraft[];
};

type DayGroup = {
  dateLabel: string;
  entries: TimeEntry[];
  key: string;
  totalSeconds: number;
};

type NormalizedDraftWorkSlots =
  | { error: string }
  | { totalSeconds: number; workSlots: WorkSlot[] };

const dateKeyFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "2-digit",
  timeZone: appTimeZone,
  year: "numeric",
});

const dayHeadingFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  timeZone: appTimeZone,
  weekday: "long",
  year: "numeric",
});

const timeOnlyFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: appTimeZone,
});

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function dateKeyFromDate(date: Date) {
  if (Number.isNaN(date.getTime())) return "unknown";

  const parts = Object.fromEntries(dateKeyFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  const year = parts.year;
  const month = parts.month;
  const day = parts.day;

  return year && month && day ? `${year}-${month}-${day}` : date.toISOString().slice(0, 10);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: appTimeZone,
  }).format(new Date(value));
}

function formatDayHeading(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : dayHeadingFormatter.format(date);
}

function formatTimeOnly(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--:--" : timeOnlyFormatter.format(date);
}

function formatSlotRange(slot: WorkSlot) {
  return `${formatTimeOnly(slot.startedAt)} - ${formatTimeOnly(slot.endedAt)}`;
}

function formatNokkScore(value: number | null) {
  return value === null ? "NOKK NA" : `NOKK ${value}/10`;
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function createSlotDraftId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function addMinutesToDateTimeLocal(value: string, minutes: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return toDateTimeLocal(new Date().toISOString());

  return toDateTimeLocal(new Date(date.getTime() + minutes * 60 * 1000).toISOString());
}

function entryWorkSlots(entry: TimeEntry) {
  return entry.workSlots?.length
    ? entry.workSlots
    : [{ startedAt: entry.startedAt, endedAt: entry.endedAt }];
}

function entryWorkSlotDrafts(entry: TimeEntry): WorkSlotDraft[] {
  return entryWorkSlots(entry).map((slot) => ({
    id: createSlotDraftId(),
    endedAt: toDateTimeLocal(slot.endedAt),
    startedAt: toDateTimeLocal(slot.startedAt),
  }));
}

function slotDurationSeconds(slot: WorkSlot) {
  const startedAt = new Date(slot.startedAt);
  const endedAt = new Date(slot.endedAt);

  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) return 0;

  return Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
}

function draftDurationSeconds(draft: EditLogDraft) {
  return draft.workSlots.reduce((sum, slot) => sum + slotDurationSeconds(slot), 0);
}

function normalizeDraftWorkSlots(draft: EditLogDraft): NormalizedDraftWorkSlots {
  if (draft.workSlots.length === 0 || draft.workSlots.length > 12) {
    return { error: "Add between 1 and 12 time slots." };
  }

  const normalized = draft.workSlots.map((slot, index) => {
    const startedAt = new Date(slot.startedAt);
    const endedAt = new Date(slot.endedAt);

    if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
      return { error: `Slot ${index + 1} needs a valid start and end time.` };
    }

    const seconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
    if (seconds < 1) {
      return { error: `Slot ${index + 1} must end after it starts.` };
    }

    return {
      endedAt: endedAt.toISOString(),
      endedAtMs: endedAt.getTime(),
      seconds,
      startedAt: startedAt.toISOString(),
      startedAtMs: startedAt.getTime(),
    };
  });

  const invalidSlot = normalized.find((slot): slot is { error: string } => "error" in slot);
  if (invalidSlot) return invalidSlot;

  const slots = normalized
    .filter((slot): slot is Exclude<(typeof normalized)[number], { error: string }> => !("error" in slot))
    .sort((a, b) => a.startedAtMs - b.startedAtMs);

  for (let index = 1; index < slots.length; index += 1) {
    if (slots[index].startedAtMs < slots[index - 1].endedAtMs) {
      return { error: "Time slots cannot overlap." };
    }
  }

  const firstSlot = slots[0];
  const lastSlot = slots[slots.length - 1];
  const totalSeconds = slots.reduce((sum, slot) => sum + slot.seconds, 0);
  const rangeSeconds = Math.floor((lastSlot.endedAtMs - firstSlot.startedAtMs) / 1000);

  if (totalSeconds < 1 || totalSeconds > 24 * 60 * 60 || rangeSeconds > 24 * 60 * 60) {
    return { error: "Time slots must stay within a 24-hour work range." };
  }

  return {
    totalSeconds,
    workSlots: slots.map(({ endedAt, startedAt }) => ({ endedAt, startedAt })),
  };
}

function todayKey() {
  return dateKeyFromDate(new Date());
}

function weekAgoKey() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return dateKeyFromDate(date);
}

function groupTimeEntries(entries: TimeEntry[]) {
  const groups = new Map<string, DayGroup>();

  for (const entry of entries) {
    const key = dateKeyFromDate(new Date(entry.endedAt));
    const current = groups.get(key) ?? {
      dateLabel: formatDayHeading(entry.endedAt),
      entries: [],
      key,
      totalSeconds: 0,
    };

    current.entries.push(entry);
    current.totalSeconds += entry.totalSeconds;
    groups.set(key, current);
  }

  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
}

export function EmployeeLogsPanel() {
  const reportRef = useRef<HTMLElement | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [startDate, setStartDate] = useState(() => weekAgoKey());
  const [endDate, setEndDate] = useState(() => todayKey());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [savingLogId, setSavingLogId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditLogDraft | null>(null);
  const totalSeconds = timeEntries.reduce((sum, entry) => sum + entry.totalSeconds, 0);
  const groupedEntries = useMemo(() => groupTimeEntries(timeEntries), [timeEntries]);

  const loadLogs = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!options.silent) setLoading(true);

      try {
        const params = new URLSearchParams();
        if (startDate) params.set("start", startDate);
        if (endDate) params.set("end", endDate);

        const response = await fetch(`/api/work/time-entries?${params.toString()}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as {
          timeEntries?: TimeEntry[];
          error?: string;
        } | null;

        if (!response.ok || !payload) {
          setMessage(payload?.error ?? "Could not load logs.");
          return;
        }

        setMessage("");
        setTimeEntries(payload.timeEntries ?? []);
      } catch {
        setMessage("Could not load logs.");
      } finally {
        if (!options.silent) setLoading(false);
      }
    },
    [endDate, startDate]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadLogs();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadLogs]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadLogs({ silent: true });
    }, 15000);

    return () => window.clearInterval(interval);
  }, [loadLogs]);

  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void loadLogs({ silent: true });
      }
    }

    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible);
  }, [loadLogs]);

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
      nokkScore: entry.nokkScore === null ? "NA" : String(entry.nokkScore),
      outputSummary: entry.outputSummary,
      taskTitle: entry.taskTitle,
      workSlots: entryWorkSlotDrafts(entry),
    });
  }

  function cancelEditing() {
    setEditingLogId(null);
    setEditDraft(null);
  }

  function updateWorkSlot(index: number, field: keyof WorkSlot, value: string) {
    setEditDraft((current) => {
      if (!current) return current;

      return {
        ...current,
        workSlots: current.workSlots.map((slot, slotIndex) =>
          slotIndex === index ? { ...slot, [field]: value } : slot
        ),
      };
    });
  }

  function addWorkSlot() {
    setEditDraft((current) => {
      if (!current) return current;

      const lastSlot = current.workSlots[current.workSlots.length - 1];
      const startedAt = lastSlot?.endedAt || toDateTimeLocal(new Date().toISOString());
      const endedAt = addMinutesToDateTimeLocal(startedAt, 60);

      return {
        ...current,
        workSlots: [...current.workSlots, { id: createSlotDraftId(), endedAt, startedAt }],
      };
    });
  }

  function removeWorkSlot(index: number) {
    setEditDraft((current) => {
      if (!current || current.workSlots.length <= 1) return current;

      return {
        ...current,
        workSlots: current.workSlots.filter((_, slotIndex) => slotIndex !== index),
      };
    });
  }

  async function saveLog(entryId: string) {
    if (!editDraft) return;

    if (!editDraft.taskTitle.trim() || !editDraft.outputSummary.trim()) {
      setMessage("Task and output summary are required.");
      return;
    }

    const normalizedSlots = normalizeDraftWorkSlots(editDraft);
    if ("error" in normalizedSlots) {
      setMessage(normalizedSlots.error);
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
        nokkScore: editDraft.nokkScore,
        workSlots: normalizedSlots.workSlots,
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
      timeEntry?: Pick<
        TimeEntry,
        "id" | "endedAt" | "nokkScore" | "outputSummary" | "startedAt" | "taskTitle" | "totalSeconds" | "workSlots"
      >;
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
            .log-day-group { margin-top: 20px; padding-top: 14px; border-top: 1px solid #d1d5db; }
            .log-day-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
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

      <div className="mt-5 grid gap-6">
        {groupedEntries.map((group) => (
          <section
            key={group.key}
            className="log-day-group grid gap-3 border-t border-[var(--border-soft)] pt-5 first:border-t-0 first:pt-0"
          >
            <div className="log-day-header flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-2xl font-normal">{group.dateLabel}</h3>
                <p className="mt-1 text-sm text-muted">
                  {group.entries.length} {group.entries.length === 1 ? "log" : "logs"}
                </p>
              </div>
              <span className="rounded-full border border-[var(--accent-breeze)] px-3 py-2 font-mono text-sm text-[var(--accent-breeze)]">
                {formatDuration(group.totalSeconds)} worked
              </span>
            </div>

            <div className="grid gap-3">
              {group.entries.map((entry) => (
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
                      {entryWorkSlots(entry).length > 1 ? (
                        <p className="mt-2 text-xs text-muted">
                          Slots: {entryWorkSlots(entry).map(formatSlotRange).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-muted">
                        {formatNokkScore(entry.nokkScore)}
                      </span>
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
                          onChange={(event) =>
                            setEditDraft((current) => current ? { ...current, taskTitle: event.target.value } : current)
                          }
                          className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)]"
                        />
                      </label>
                      <label className="grid gap-2 text-sm text-muted">
                        Output summary
                        <textarea
                          value={editDraft.outputSummary}
                          onChange={(event) =>
                            setEditDraft((current) =>
                              current ? { ...current, outputSummary: event.target.value } : current
                            )
                          }
                          className="min-h-28 border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)]"
                        />
                      </label>
                      <label className="grid max-w-52 gap-2 text-sm text-muted">
                        NOKK score
                        <select
                          value={editDraft.nokkScore}
                          onChange={(event) =>
                            setEditDraft((current) => current ? { ...current, nokkScore: event.target.value } : current)
                          }
                          className="border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base text-[var(--foreground)]"
                        >
                          <option value="NA">NA</option>
                          {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
                            <option key={score} value={String(score)}>
                              {score}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="grid gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Time slots</p>
                          <button
                            type="button"
                            onClick={addWorkSlot}
                            className="border border-[var(--border)] px-4 py-2 text-xs"
                          >
                            Add slot
                          </button>
                        </div>

                        <div className="grid gap-2">
                          {editDraft.workSlots.map((slot, index) => (
                            <div
                              key={slot.id}
                              className="grid gap-3 border border-[var(--border-soft)] bg-[var(--surface)] p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem_auto] md:items-end"
                            >
                              <label className="grid gap-2 text-sm text-muted">
                                Start
                                <input
                                  type="datetime-local"
                                  value={slot.startedAt}
                                  onChange={(event) => updateWorkSlot(index, "startedAt", event.target.value)}
                                  className="w-full border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-base text-[var(--foreground)]"
                                />
                              </label>
                              <label className="grid gap-2 text-sm text-muted">
                                End
                                <input
                                  type="datetime-local"
                                  value={slot.endedAt}
                                  onChange={(event) => updateWorkSlot(index, "endedAt", event.target.value)}
                                  className="w-full border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-base text-[var(--foreground)]"
                                />
                              </label>
                              <div className="border border-[var(--border-soft)] bg-[var(--surface-elevated)] px-4 py-3">
                                <p className="font-mono text-xs uppercase text-muted">Slot {index + 1}</p>
                                <strong className="font-mono text-base font-normal tabular-nums">
                                  {formatDuration(slotDurationSeconds(slot))}
                                </strong>
                              </div>
                              {editDraft.workSlots.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => removeWorkSlot(index)}
                                  className="border border-[var(--danger-border)] px-4 py-3 text-xs text-[var(--danger)]"
                                >
                                  Remove
                                </button>
                              ) : (
                                <span className="hidden md:block" />
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3">
                          <p className="font-mono text-xs uppercase text-muted">Total worked</p>
                          <strong className="font-mono text-base font-normal tabular-nums">
                            {formatDuration(draftDurationSeconds(editDraft))}
                          </strong>
                        </div>
                      </div>

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
        ))}
      </div>
    </section>
  );
}
