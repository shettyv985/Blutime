import type { AdminLog } from "../types";
import { formatDuration } from "../lib/time";
import { LinkifiedText } from "./LinkifiedText";

const ratings = ["Excellent", "Good", "Acceptable", "Bad"] as const;
type Rating = (typeof ratings)[number];

const ratingColors: Record<Rating, string> = {
  Excellent: "var(--success)",
  Good: "var(--primary)",
  Acceptable: "var(--warning)",
  Bad: "var(--danger)",
};

const ratingBadges: Record<Rating, string> = {
  Excellent: "badge-success",
  Good: "badge-primary",
  Acceptable: "badge-warning",
  Bad: "badge-danger",
};

type AdminPerformanceReviewProps = {
  logs: AdminLog[];
  selectedEmployee: string;
  startDate: string;
  endDate: string;
  onEmployeeChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onRatingChange: (logId: string, rating: Rating | "") => void;
  onDeleteLog: (logId: string) => void;
};

function getEmployeeName(emailOrId?: string) {
  if (!emailOrId) return "Unknown";
  return emailOrId.includes("@") ? emailOrId.split("@")[0] : emailOrId;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "0.4rem",
  fontSize: "0.68rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "var(--muted)",
};

export function AdminPerformanceReview({
  logs,
  selectedEmployee,
  startDate,
  endDate,
  onEmployeeChange,
  onStartDateChange,
  onEndDateChange,
  onRatingChange,
  onDeleteLog,
}: AdminPerformanceReviewProps) {
  const employees = Array.from(
    new Set(logs.map((log) => log.user_email || log.user_id))
  ).sort();

  const filteredLogs = logs.filter((log) => {
    const logDate = new Date(log.started_at);
    const afterStart = startDate ? logDate >= new Date(`${startDate}T00:00:00`) : true;
    const beforeEnd = endDate ? logDate <= new Date(`${endDate}T23:59:59`) : true;
    const employeeMatch = selectedEmployee
      ? (log.user_email || log.user_id) === selectedEmployee
      : true;
    return afterStart && beforeEnd && employeeMatch;
  });

  const totalSeconds = filteredLogs.reduce((sum, log) => sum + log.total_seconds, 0);
  const ratingCounts = ratings.reduce(
    (result, rating) => ({
      ...result,
      [rating]: filteredLogs.filter((log) => log.quality_rating === rating).length,
    }),
    {} as Record<Rating, number>
  );

  return (
    <section className="card" style={{ borderRadius: "var(--radius-xl)", padding: "1.375rem 1.5rem" }}>
      <div style={{ marginBottom: "1.25rem" }}>
        <h3 className="section-title">Performance review</h3>
        <p className="section-desc">Filter employee work by date range and rate task quality.</p>
      </div>

      {/* Filters */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.25rem" }}
           className="perf-filters">
        <div>
          <label style={labelStyle}>Employee</label>
          <select className="field" value={selectedEmployee} onChange={(e) => onEmployeeChange(e.target.value)}>
            <option value="">All employees</option>
            {employees.map((emp) => (
              <option key={emp} value={emp}>{getEmployeeName(emp)}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>From</label>
          <input className="field" type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>To</label>
          <input className="field" type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} />
        </div>
      </div>

      {/* Stats */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.625rem", marginBottom: "1.25rem" }}
        className="perf-stats"
      >
        <div className="stat-card" style={{ gridColumn: "span 1" }}>
          <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", margin: 0 }}>Total</p>
          <p
            className="timer-display"
            style={{ marginTop: "0.35rem", fontSize: "1.375rem", fontWeight: 600, color: "var(--primary)", margin: "0.35rem 0 0" }}
          >
            {formatDuration(totalSeconds)}
          </p>
        </div>
        <div className="stat-card">
          <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", margin: 0 }}>Tasks</p>
          <p style={{ marginTop: "0.35rem", fontSize: "1.375rem", fontWeight: 600, fontFamily: "var(--font-mono)", margin: "0.35rem 0 0" }}>
            {filteredLogs.length}
          </p>
        </div>
        {ratings.map((rating) => (
          <div key={rating} className="stat-card">
            <p style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", margin: 0 }}>{rating}</p>
            <p style={{ marginTop: "0.35rem", fontSize: "1.375rem", fontWeight: 600, color: ratingColors[rating], fontFamily: "var(--font-mono)", margin: "0.35rem 0 0" }}>
              {ratingCounts[rating]}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto scroll-area">
        <table className="data-table" style={{ minWidth: "1050px" }}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Date</th>
              <th>Duration</th>
              <th>Task</th>
              <th>Client</th>
              <th>Category</th>
              <th>Quality</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id}>
                <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                  {getEmployeeName(log.user_email || log.user_id)}
                </td>
                <td style={{ whiteSpace: "nowrap", fontSize: "0.78rem", color: "var(--muted)" }}>
                  {new Date(log.started_at).toLocaleDateString()}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <span className="timer-display" style={{ color: "var(--primary)", fontWeight: 600 }}>
                    {formatDuration(log.total_seconds)}
                  </span>
                </td>
                <td style={{ maxWidth: "240px", wordBreak: "break-word" }}>
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
                <td>
                  <select
                    className="field"
                    style={{ minHeight: "2.1rem", fontSize: "0.78rem", padding: "0.25rem 0.65rem" }}
                    value={log.quality_rating ?? ""}
                    onChange={(e) => onRatingChange(log.id, e.target.value as Rating | "")}
                  >
                    <option value="">Not rated</option>
                    {ratings.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <button className="btn-danger" onClick={() => onDeleteLog(log.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "var(--muted)" }}>
                  No logs match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .perf-filters { grid-template-columns: 1fr 1fr !important; }
          .perf-stats { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .perf-filters { grid-template-columns: 1fr !important; }
          .perf-stats { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </section>
  );
}