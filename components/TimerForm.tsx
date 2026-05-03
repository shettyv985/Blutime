import type { Category, Client, RoutineItem } from "../types";

type TimerFormProps = {
  taskText: string;
  clientId: string;
  category: string;
  clients: Client[];
  categories: Category[];
  routineItems: RoutineItem[];
  routineDateLabel: string;
  selectedRoutineItemId: string;
  routineWarning: string;
  canStart: boolean;
  currentMemberId: string;
  onTaskTextChange: (value: string) => void;
  onClientIdChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onRoutineItemChange: (value: string) => void;
  onStart: () => void;
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "0.4rem",
  fontSize: "0.68rem",
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--muted)",
};

export function TimerForm({
  taskText,
  clientId,
  category,
  clients,
  categories,
  routineItems,
  routineDateLabel,
  selectedRoutineItemId,
  routineWarning,
  canStart,
  currentMemberId,
  onTaskTextChange,
  onClientIdChange,
  onCategoryChange,
  onRoutineItemChange,
  onStart,
}: TimerFormProps) {
  return (
    <section
      className="card"
      style={{ borderRadius: "var(--radius-xl)", padding: "1.375rem 1.5rem" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <h2
            className="section-title"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <span
              style={{
                display: "inline-flex",
                width: "1.75rem",
                height: "1.75rem",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "var(--radius-sm)",
                background: "var(--primary-glow)",
                color: "var(--primary)",
                fontSize: "0.7rem",
              }}
            >
              &gt;
            </span>
            Start new timer
          </h2>
          <p className="section-desc">Select a routine, fill in task details, and start tracking.</p>
        </div>
        {routineDateLabel && (
          <span className="badge badge-primary" style={{ flexShrink: 0 }}>
            {routineDateLabel}
          </span>
        )}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={labelStyle}>Planned routine</label>
        <select
          className="field"
          value={selectedRoutineItemId}
          onChange={(e) => onRoutineItemChange(e.target.value)}
        >
          <option value="">No planned routine selected</option>
          {routineItems.map((item) => {
            const isShared = item.team_member_id !== currentMemberId;
            const isCoverage = item.notes?.startsWith("Coverage window");

            return (
              <option key={item.id} value={item.id}>
                {isShared ? (isCoverage ? "[Coverage pickup] " : "[Shared] ") : ""}
                {item.client_name} - {item.campaign_type} - {item.output_type} -{" "}
                {item.completed_count}/{item.planned_count}
                {isShared ? ` - ${item.person_name}` : ""}
              </option>
            );
          })}
        </select>
      </div>

      {routineWarning && (
        <div
          style={{
            marginBottom: "1rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            borderRadius: "var(--radius-md)",
            border: "1.5px solid var(--warning-border)",
            background: "var(--warning-soft)",
            color: "var(--warning)",
            padding: "0.65rem 0.875rem",
            fontSize: "0.82rem",
            fontWeight: 500,
          }}
        >
          <span style={{ flexShrink: 0, marginTop: "0.05rem" }}>!</span>
          <span>{routineWarning}</span>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,2fr) minmax(140px,1fr) minmax(160px,1fr) auto",
          gap: "0.75rem",
          alignItems: "end",
        }}
        className="timer-form-grid"
      >
        <div>
          <label style={labelStyle}>Task</label>
          <input
            className="field"
            placeholder="Task, link, or description..."
            value={taskText}
            onChange={(e) => onTaskTextChange(e.target.value)}
          />
        </div>

        <div>
          <label style={labelStyle}>Client</label>
          <select
            className="field"
            value={clientId}
            onChange={(e) => onClientIdChange(e.target.value)}
          >
            <option value="">Select client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Category</label>
          <select
            className="field"
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            <option value="">Select category</option>
            {categories.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <button
          disabled={!canStart}
          onClick={onStart}
          style={{
            minHeight: "2.5rem",
            padding: "0 1.375rem",
            borderRadius: "var(--radius-md)",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "0.875rem",
            letterSpacing: "-0.02em",
            border: "none",
            background: canStart
              ? "linear-gradient(135deg, var(--primary), var(--primary-dim))"
              : "var(--surface-soft)",
            color: canStart ? "white" : "var(--muted)",
            boxShadow: canStart ? "0 4px 18px var(--primary-glow-strong)" : "none",
            transition: "all 200ms ease",
            whiteSpace: "nowrap",
          }}
        >
          Start
        </button>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .timer-form-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
