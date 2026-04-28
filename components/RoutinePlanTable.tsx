import type { RoutineItem } from "../types";

type RoutinePlanTableProps = {
  items: RoutineItem[];
};

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getStatus(item: RoutineItem) {
  if (item.completed_count >= item.planned_count) return "done";
  if (item.completed_count > 0) return "progress";
  return "pending";
}

const statusConfig = {
  done:     { label: "Done",        badge: "badge-success" },
  progress: { label: "In progress", badge: "badge-warning" },
  pending:  { label: "Pending",     badge: "badge-primary" },
};

export function RoutinePlanTable({ items }: RoutinePlanTableProps) {
  const sortedItems = [...items].sort((a, b) => {
    if (a.work_date !== b.work_date) return a.work_date.localeCompare(b.work_date);
    if (a.person_name !== b.person_name) return a.person_name.localeCompare(b.person_name);
    return a.client_name.localeCompare(b.client_name);
  });

  const doneCount     = items.filter((i) => i.completed_count >= i.planned_count).length;
  const progressCount = items.filter((i) => i.completed_count > 0 && i.completed_count < i.planned_count).length;
  const pendingCount  = items.length - doneCount - progressCount;

  return (
    <section className="card" style={{ borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          borderBottom: "1px solid var(--border-soft)",
          padding: "1.125rem 1.5rem",
        }}
      >
        <div>
          <h3 className="section-title">Generated routine plan</h3>
          <p className="section-desc">Daily minimums by person, client, and output type.</p>
        </div>
        {items.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span className="badge badge-success">{doneCount} done</span>
            <span className="badge badge-warning">{progressCount} in progress</span>
            <span className="badge badge-primary">{pendingCount} pending</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto scroll-area">
        <table className="data-table" style={{ minWidth: "1050px" }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Person</th>
              <th>Client</th>
              <th>Campaign</th>
              <th>Output</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => {
              const status = getStatus(item);
              const pct = Math.min(100, (item.completed_count / item.planned_count) * 100);
              return (
                <tr key={item.id}>
                  <td style={{ whiteSpace: "nowrap", fontWeight: 600, fontSize: "0.78rem" }}>
                    {formatDate(item.work_date)}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <p style={{ fontWeight: 600, margin: 0, fontSize: "0.855rem" }}>{item.person_name}</p>
                    <p style={{ fontSize: "0.72rem", color: "var(--muted)", margin: 0 }}>
                      {item.role} · {item.pod}
                    </p>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className="badge badge-primary">{item.client_name}</span>
                  </td>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.8rem", color: "var(--muted)" }}>
                    {item.campaign_type}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span
                      style={{
                        borderRadius: "var(--radius-xs)",
                        padding: "0.15rem 0.5rem",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        background: "var(--surface-soft)",
                        color: "var(--foreground-secondary)",
                        border: "1px solid var(--border-soft)",
                      }}
                    >
                      {item.output_type}
                    </span>
                  </td>
                  <td style={{ whiteSpace: "nowrap", minWidth: "130px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        className="timer-display"
                        style={{ fontSize: "0.8rem", fontWeight: 600, flexShrink: 0 }}
                      >
                        {item.completed_count}/{item.planned_count}
                      </span>
                      <div className="progress-bar" style={{ flex: 1, minWidth: "50px" }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${pct}%`,
                            background: pct >= 100
                              ? "var(--success)"
                              : pct > 0
                              ? "linear-gradient(90deg, var(--warning), var(--primary))"
                              : "var(--primary)",
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className={`badge ${statusConfig[status].badge}`}>
                      {statusConfig[status].label}
                    </span>
                  </td>
                  <td style={{ maxWidth: "220px", wordBreak: "break-word", fontSize: "0.8rem", color: "var(--muted)" }}>
                    {item.notes ?? "—"}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: "3rem", textAlign: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.75rem", opacity: 0.4 }}>📋</span>
                    <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>
                      No routine plan generated yet.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}