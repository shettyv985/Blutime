"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LinkifiedText } from "@/components/LinkifiedText";

type Option = { id: string; name: string };
type GroupTotal = { id: string; name: string; totalSeconds: number; logCount: number };
type ReportLog = {
  id: string;
  userName: string;
  clientName: string;
  categoryName: string;
  taskTitle: string;
  outputSummary: string;
  totalSeconds: number;
  endedAt: string;
};
type ReportPayload = {
  totals: { totalSeconds: number; logCount: number; employeeCount: number; clientCount: number };
  groups: { byEmployee: GroupTotal[]; byClient: GroupTotal[]; byCategory: GroupTotal[] };
  logs: ReportLog[];
  options: { employees: Option[]; clients: Option[]; categories: Option[] };
};
type EditLogDraft = { outputSummary: string; taskTitle: string; totalMinutes: string };

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function GroupList({ title, items }: { title: string; items: GroupTotal[] }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-3 grid gap-2">
        {items.length === 0 ? <p className="text-base text-muted">No data.</p> : null}
        {items.slice(0, 8).map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface)] px-4 py-3">
            <div>
              <p className="font-semibold">{item.name}</p>
              <p className="text-sm text-muted">{item.logCount} logs</p>
            </div>
            <strong className="text-lg tabular-nums">{formatDuration(item.totalSeconds)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminReportsPanel() {
  const reportRef = useRef<HTMLElement | null>(null);
  const [range, setRange] = useState("today");
  const [employeeId, setEmployeeId] = useState("");
  const [clientId, setClientId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [start, setStart] = useState(todayKey());
  const [end, setEnd] = useState(todayKey());
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingLogId, setDeletingLogId] = useState("");
  const [editingLogId, setEditingLogId] = useState("");
  const [savingLogId, setSavingLogId] = useState("");
  const [editDraft, setEditDraft] = useState<EditLogDraft | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ range });
    if (employeeId) params.set("employeeId", employeeId);
    if (clientId) params.set("clientId", clientId);
    if (categoryId) params.set("categoryId", categoryId);
    if (range === "custom") {
      params.set("start", start);
      params.set("end", end);
    }
    return params.toString();
  }, [categoryId, clientId, employeeId, end, range, start]);

  const loadReport = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setLoading(true);
    if (!options.silent) setError("");
    const response = await fetch(`/api/admin/reports?${query}`);
    const payload = (await response.json().catch(() => null)) as ReportPayload & { error?: string } | null;

    if (!options.silent) setLoading(false);

    if (!response.ok || !payload) {
      setError(payload?.error ?? "Could not load reports.");
      return;
    }

    setReport(payload);
  }, [query]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadReport({ silent: true });
    }, 15000);

    return () => window.clearInterval(interval);
  }, [loadReport]);

  const totals = report?.totals;

  async function deleteLog(logId: string) {
    const confirmed = window.confirm("Delete this saved work log? This will remove it from reports.");
    if (!confirmed) return;

    setDeletingLogId(logId);
    setError("");

    const response = await fetch(`/api/work/time-entries/${logId}`, { method: "DELETE" });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    setDeletingLogId("");

    if (!response.ok) {
      setError(payload?.error ?? "Could not delete log.");
      return;
    }

    await loadReport();
  }

  function startEditing(log: ReportLog) {
    setError("");
    setEditingLogId(log.id);
    setEditDraft({
      outputSummary: log.outputSummary,
      taskTitle: log.taskTitle,
      totalMinutes: String(Math.max(1, Math.round(log.totalSeconds / 60))),
    });
  }

  function cancelEditing() {
    setEditingLogId("");
    setEditDraft(null);
  }

  async function saveLog(logId: string) {
    if (!editDraft) return;

    const totalMinutes = Number(editDraft.totalMinutes);
    if (!editDraft.taskTitle.trim() || !editDraft.outputSummary.trim() || !Number.isFinite(totalMinutes) || totalMinutes <= 0) {
      setError("Task, output summary, and valid minutes are required.");
      return;
    }

    setError("");
    setSavingLogId(logId);
    const response = await fetch(`/api/work/time-entries/${logId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskTitle: editDraft.taskTitle,
        outputSummary: editDraft.outputSummary,
        totalSeconds: Math.round(totalMinutes * 60),
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    setSavingLogId("");

    if (!response.ok) {
      setError(payload?.error ?? "Could not update log.");
      return;
    }

    cancelEditing();
    await loadReport();
  }

  function exportReportPdf() {
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
          <title>blu-time report</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 28px; color: #111827; font-family: Arial, sans-serif; font-size: 13px; line-height: 1.45; }
            h2 { margin: 0; font-size: 26px; }
            h3 { margin: 0 0 10px; font-size: 17px; }
            p { margin: 0; }
            .card, .report-print-area { border: 0; box-shadow: none; background: #ffffff; }
            .stat-card, article, .rounded-2xl, .rounded-xl { border: 1px solid #d1d5db; border-radius: 10px; background: #ffffff; }
            .stat-card { padding: 12px; }
            .grid { display: grid; gap: 12px; }
            .md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            .xl\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .items-start { align-items: flex-start; }
            .justify-between { justify-content: space-between; }
            .gap-3, .gap-4 { gap: 12px; }
            .mt-1 { margin-top: 4px; }
            .mt-2 { margin-top: 8px; }
            .mt-3 { margin-top: 12px; }
            .mt-5 { margin-top: 20px; }
            .p-4 { padding: 14px; }
            .px-4 { padding-left: 14px; padding-right: 14px; }
            .py-3 { padding-top: 10px; padding-bottom: 10px; }
            .text-muted, .text-base, .text-sm { color: #4b5563; }
            .font-semibold, strong { font-weight: 700; }
            .text-2xl { font-size: 22px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; }
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
    <section ref={reportRef} className="card report-print-area mt-4 rounded-2xl p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">reports</p>
          <h2 className="mt-1 text-3xl font-bold">Admin reports</h2>
          <p className="mt-2 text-base text-muted">Filter work logs by period, employee, client, and category.</p>
        </div>
        <button
          type="button"
          onClick={exportReportPdf}
          className="no-print rounded-xl border border-[var(--border)] px-5 py-3 text-base font-semibold"
        >
          Export PDF
        </button>
      </div>

      <div className="no-print mt-5 grid gap-3 lg:grid-cols-6">
        <select value={range} onChange={(event) => setRange(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base">
          <option value="today">Today</option>
          <option value="week">Last 7 days</option>
          <option value="month">Last 30 days</option>
          <option value="custom">Custom</option>
        </select>
        {range === "custom" ? (
          <>
            <input type="date" value={start} onChange={(event) => setStart(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base" />
            <input type="date" value={end} onChange={(event) => setEnd(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base" />
          </>
        ) : null}
        <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base">
          <option value="">All employees</option>
          {report?.options.employees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select value={clientId} onChange={(event) => setClientId(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base">
          <option value="">All clients</option>
          {report?.options.clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base">
          <option value="">All categories</option>
          {report?.options.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>

      {loading ? <p className="mt-4 text-base text-muted">Loading reports...</p> : null}
      {error ? <p className="mt-4 text-base text-red-400">{error}</p> : null}

      {totals ? (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="stat-card"><p className="text-sm text-muted p-2">Total time</p><strong className="mt-1 block text-2xl p-2">{formatDuration(totals.totalSeconds)}</strong></div>
            <div className="stat-card"><p className="text-sm text-muted p-2">Logs</p><strong className="mt-1 block text-2xl p-2">{totals.logCount}</strong></div>
            <div className="stat-card"><p className="text-sm text-muted p-2">Employees</p><strong className="mt-1 block text-2xl p-2">{totals.employeeCount}</strong></div>
            <div className="stat-card"><p className="text-sm text-muted p-2">Clients</p><strong className="mt-1 block text-2xl p-2">{totals.clientCount}</strong></div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <GroupList title="By employee" items={report.groups.byEmployee} />
            <GroupList title="By client" items={report.groups.byClient} />
            <GroupList title="By category" items={report.groups.byCategory} />
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="data-table min-w-[1080px]">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Client</th>
                  <th>Category</th>
                  <th>Task</th>
                  <th>Output</th>
                  <th>Time</th>
                  <th className="no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {report.logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.userName}</td>
                    <td>{log.clientName}</td>
                    <td>{log.categoryName}</td>
                    <td>
                      {editingLogId === log.id && editDraft ? (
                        <input
                          value={editDraft.taskTitle}
                          onChange={(event) => setEditDraft((current) => current ? { ...current, taskTitle: event.target.value } : current)}
                          className="w-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                        />
                      ) : log.taskTitle}
                    </td>
                    <td>
                      {editingLogId === log.id && editDraft ? (
                        <textarea
                          value={editDraft.outputSummary}
                          onChange={(event) => setEditDraft((current) => current ? { ...current, outputSummary: event.target.value } : current)}
                          className="min-h-24 w-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                        />
                      ) : (
                        <LinkifiedText text={log.outputSummary} />
                      )}
                    </td>
                    <td className="font-semibold tabular-nums">
                      {editingLogId === log.id && editDraft ? (
                        <label className="grid gap-1 text-xs text-muted">
                          Minutes
                          <input
                            type="number"
                            min="1"
                            max="1440"
                            value={editDraft.totalMinutes}
                            onChange={(event) => setEditDraft((current) => current ? { ...current, totalMinutes: event.target.value } : current)}
                            className="w-28 border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                          />
                        </label>
                      ) : formatDuration(log.totalSeconds)}
                    </td>
                    <td className="no-print">
                      <div className="flex flex-wrap gap-2">
                        {editingLogId === log.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void saveLog(log.id)}
                              disabled={savingLogId === log.id}
                              className="border border-[var(--border-strong)] px-4 py-2 text-sm disabled:opacity-50"
                            >
                              {savingLogId === log.id ? "Saving..." : "Save"}
                            </button>
                            <button type="button" onClick={cancelEditing} className="border border-[var(--border)] px-4 py-2 text-sm">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button type="button" onClick={() => startEditing(log)} className="border border-[var(--border)] px-4 py-2 text-sm">
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void deleteLog(log.id)}
                          disabled={deletingLogId === log.id}
                          className="border border-[var(--accent-sunset)] px-4 py-2 text-sm text-[var(--accent-sunset)] disabled:opacity-50"
                        >
                          {deletingLogId === log.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
