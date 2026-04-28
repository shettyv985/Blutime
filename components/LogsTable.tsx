import type { TimeLog } from "../types";
import { formatDuration } from "../lib/time";
import { LinkifiedText } from "./LinkifiedText";

type LogsTableProps = {
  logs: TimeLog[];
};

export function LogsTable({ logs }: LogsTableProps) {
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
          <p className="section-desc">Completed activity history.</p>
        </div>
        {logs.length > 0 && (
          <span className="badge badge-primary">{logs.length} entries</span>
        )}
      </div>

      <div className="card" style={{ borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
        <div className="overflow-x-auto scroll-area">
          <table className="data-table" style={{ minWidth: "860px" }}>
            <thead>
              <tr>
                <th>Start</th>
                <th>End</th>
                <th>Duration</th>
                <th>Task</th>
                <th>Client</th>
                <th>Category</th>
                <th>Output</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.78rem", color: "var(--muted)" }}>
                    {new Date(log.started_at).toLocaleString()}
                  </td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.78rem", color: "var(--muted)" }}>
                    {new Date(log.ended_at).toLocaleString()}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span
                      className="timer-display"
                      style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.875rem" }}
                    >
                      {formatDuration(log.total_seconds)}
                    </span>
                  </td>
                  <td style={{ maxWidth: "240px", wordBreak: "break-word", fontWeight: 500 }}>
  <LinkifiedText text={log.task_text} />
</td>

                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className="badge badge-primary">{log.client_name}</span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span
                      style={{
                        borderRadius: "var(--radius-xs)",
                        padding: "0.15rem 0.5rem",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        background: "var(--surface-soft)",
                        color: "var(--muted)",
                        border: "1px solid var(--border-soft)",
                      }}
                    >
                      {log.category}
                    </span>
                  </td>
                  <td
  style={{
    maxWidth: "220px",
    wordBreak: "break-word",
    fontSize: "0.8rem",
    color: "var(--muted)",
  }}
>
  <LinkifiedText text={log.output_text} emptyText="—" />
</td>

                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "3rem", textAlign: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "2rem", opacity: 0.4 }}>⏱</span>
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