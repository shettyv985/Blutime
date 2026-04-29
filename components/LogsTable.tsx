"use client";

import { useEffect, useState } from "react";
import type { Category, Client, TimeLog } from "../types";
import { formatDuration } from "../lib/time";

type LogsTableProps = {
  logs: TimeLog[];
  clients: Client[];
  categories: Category[];
  onSaveLog: (
    logId: string,
    patch: {
      started_at: string;
      ended_at: string;
      task_text: string;
      client_id: string;
      category: string;
      output_text: string;
    }
  ) => Promise<void>;
  onDeleteLog: (logId: string) => Promise<void>;
};

type LogDraft = {
  started_at: string;
  ended_at: string;
  task_text: string;
  client_id: string;
  category: string;
  output_text: string;
};

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function draftFromLog(log: TimeLog, clients: Client[]): LogDraft {
  const matchedClientId =
    log.client_id ??
    clients.find((client) => client.name === log.client_name)?.id ??
    "";

  return {
    started_at: toDateTimeLocal(log.started_at),
    ended_at: toDateTimeLocal(log.ended_at),
    task_text: log.task_text,
    client_id: matchedClientId,
    category: log.category,
    output_text: log.output_text ?? "",
  };
}

function getDraftDurationSeconds(draft: LogDraft) {
  const startedAt = new Date(draft.started_at);
  const endedAt = new Date(draft.ended_at);

  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
    return 0;
  }

  return Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
}

export function LogsTable({
  logs,
  clients,
  categories,
  onSaveLog,
  onDeleteLog,
}: LogsTableProps) {
  const [drafts, setDrafts] = useState<Record<string, LogDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const nextDrafts: Record<string, LogDraft> = {};

    for (const log of logs) {
      nextDrafts[log.id] = draftFromLog(log, clients);
    }

    setDrafts(nextDrafts);
  }, [logs, clients]);

  function updateDraft(logId: string, patch: Partial<LogDraft>) {
    setDrafts((current) => ({
      ...current,
      [logId]: {
        ...current[logId],
        ...patch,
      },
    }));
  }

  async function handleSave(logId: string) {
    const draft = drafts[logId];
    if (!draft) return;

    setSavingId(logId);
    try {
      await onSaveLog(logId, draft);
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(logId: string) {
    setDeletingId(logId);
    try {
      await onDeleteLog(logId);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section style={{ marginTop: "2rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "0.75rem",
        }}
      >
        <div>
          <h2 className="section-title">My logs</h2>
          <p className="section-desc">Edit or delete your completed activity history.</p>
        </div>
        {logs.length > 0 && <span className="badge badge-primary">{logs.length} entries</span>}
      </div>

      <div className="card" style={{ borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        <div className="overflow-x-auto scroll-area">
          <table className="data-table" style={{ minWidth: "1420px" }}>
            <thead>
              <tr>
                <th>Start</th>
                <th>End</th>
                <th>Duration</th>
                <th>Task</th>
                <th>Client</th>
                <th>Category</th>
                <th>Output</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const draft = drafts[log.id];
                if (!draft) return null;

                const isSaving = savingId === log.id;
                const isDeleting = deletingId === log.id;

                return (
                  <tr key={log.id}>
                    <td>
                      <input
                        className="field"
                        type="datetime-local"
                        value={draft.started_at}
                        onChange={(event) =>
                          updateDraft(log.id, { started_at: event.target.value })
                        }
                        style={{ minWidth: "190px", fontSize: "0.8rem" }}
                      />
                    </td>
                    <td>
                      <input
                        className="field"
                        type="datetime-local"
                        value={draft.ended_at}
                        onChange={(event) =>
                          updateDraft(log.id, { ended_at: event.target.value })
                        }
                        style={{ minWidth: "190px", fontSize: "0.8rem" }}
                      />
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span
                        className="timer-display"
                        style={{
                          color: "var(--primary)",
                          fontWeight: 600,
                          fontSize: "0.875rem",
                        }}
                      >
                        {formatDuration(getDraftDurationSeconds(draft))}
                      </span>
                    </td>
                    <td>
                      <textarea
                        className="field scroll-area"
                        value={draft.task_text}
                        onChange={(event) =>
                          updateDraft(log.id, { task_text: event.target.value })
                        }
                        style={{
                          minWidth: "260px",
                          minHeight: "76px",
                          resize: "vertical",
                          fontSize: "0.82rem",
                        }}
                      />
                    </td>
                    <td>
                      <select
                        className="field"
                        value={draft.client_id}
                        onChange={(event) =>
                          updateDraft(log.id, { client_id: event.target.value })
                        }
                        style={{ minWidth: "180px", fontSize: "0.8rem" }}
                      >
                        <option value="">Select client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="field"
                        value={draft.category}
                        onChange={(event) =>
                          updateDraft(log.id, { category: event.target.value })
                        }
                        style={{ minWidth: "180px", fontSize: "0.8rem" }}
                      >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <textarea
                        className="field scroll-area"
                        value={draft.output_text}
                        onChange={(event) =>
                          updateDraft(log.id, { output_text: event.target.value })
                        }
                        style={{
                          minWidth: "240px",
                          minHeight: "76px",
                          resize: "vertical",
                          fontSize: "0.82rem",
                        }}
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <button
                          className="btn-primary"
                          onClick={() => handleSave(log.id)}
                          disabled={isSaving || isDeleting}
                          style={{ minWidth: "110px" }}
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => handleDelete(log.id)}
                          disabled={isSaving || isDeleting}
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "3rem", textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span style={{ fontSize: "2rem", opacity: 0.4 }}>Time</span>
                      <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>
                        No logs yet. Start your first timer above.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
