import type { ActiveTimer } from "../types";
import { formatDuration } from "../lib/time";
import { LinkifiedText } from "./LinkifiedText";

type ActiveTimerCardProps = {
  timer: ActiveTimer;
  elapsed: number;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onOutputChange: (id: string, value: string) => void;
  onStop: (timer: ActiveTimer) => void;
  onCancel: (id: string) => void;
};

export function ActiveTimerCard({
  timer,
  elapsed,
  onPause,
  onResume,
  onOutputChange,
  onStop,
  onCancel,
}: ActiveTimerCardProps) {
  const isRunning = Boolean(timer.runningSince);
  const [hh, mm, ss] = formatDuration(elapsed).split(":");

  return (
    <div
      className={`card animate-slide-up ${isRunning ? "timer-running" : ""}`}
      style={{
        borderRadius: "var(--radius-xl)",
        padding: "1.25rem",
        borderColor: isRunning
          ? "color-mix(in srgb, var(--primary) 35%, transparent)"
          : "var(--border-soft)",
        background: isRunning
          ? "linear-gradient(135deg, color-mix(in srgb, var(--primary-glow) 80%, transparent), var(--surface-elevated))"
          : "var(--surface-elevated)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Top row */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Task info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
              {isRunning ? (
                <span className="badge badge-primary">
                  <span
                    style={{
                      width: "5px", height: "5px",
                      borderRadius: "50%",
                      background: "var(--primary)",
                      animation: "pulse 1.4s ease infinite",
                      display: "inline-block",
                    }}
                  />
                  Live
                </span>
              ) : (
                <span className="badge badge-warning">⏸ Paused</span>
              )}
            </div>

            <div
  style={{
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "0.97rem",
    letterSpacing: "-0.02em",
    lineHeight: 1.3,
    color: "var(--foreground)",
    wordBreak: "break-word",
    margin: 0,
  }}
>
  <LinkifiedText text={timer.taskText} />
</div>


            <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.35rem 0.6rem", alignItems: "center" }}>
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--primary)",
                }}
              >
                {timer.clientName}
              </span>
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
                {timer.category}
              </span>
              {timer.routineLabel && (
                <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                  📋 {timer.routineLabel}
                </span>
              )}
            </div>
          </div>

          {/* Timer display */}
          <div
            style={{
              flexShrink: 0,
              borderRadius: "var(--radius-lg)",
              padding: "0.65rem 1rem",
              textAlign: "center",
              background: isRunning
                ? "linear-gradient(135deg, var(--primary-glow), color-mix(in srgb, var(--accent-glow) 40%, transparent))"
                : "var(--surface-soft)",
              border: "1.5px solid",
              borderColor: isRunning
                ? "color-mix(in srgb, var(--primary) 25%, transparent)"
                : "var(--border-soft)",
              minWidth: "8.5rem",
            }}
          >
            <div
              className="timer-display"
              style={{
                fontSize: "2rem",
                fontWeight: 600,
                color: isRunning ? "var(--primary)" : "var(--foreground)",
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              {hh !== "00" && <span>{hh}<span className="timer-colon">:</span></span>}
              <span>{mm}</span>
              <span className="timer-colon">:</span>
              <span>{ss}</span>
            </div>
            <div
              style={{
                marginTop: "0.25rem",
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--muted)",
              }}
            >
              {isRunning ? "elapsed" : "paused"}
            </div>
          </div>
        </div>

        {/* Output */}
        <textarea
          className="field scroll-area"
          placeholder="Paste output link or write output details before stopping…"
          value={timer.outputText}
          onChange={(e) => onOutputChange(timer.id, e.target.value)}
          style={{
            minHeight: "5.5rem",
            resize: "vertical",
            fontSize: "0.845rem",
            lineHeight: 1.6,
          }}
        />

        {/* Actions */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {isRunning ? (
            <button
              onClick={() => onPause(timer.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                borderRadius: "var(--radius-md)",
                padding: "0.5rem 1rem",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "white",
                background: "var(--warning)",
                border: "none",
                boxShadow: "0 2px 10px var(--warning-soft)",
                letterSpacing: "-0.01em",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
              Pause
            </button>
          ) : (
            <button
              onClick={() => onResume(timer.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                borderRadius: "var(--radius-md)",
                padding: "0.5rem 1rem",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "white",
                background: "var(--success)",
                border: "none",
                boxShadow: "0 2px 10px var(--success-soft)",
                letterSpacing: "-0.01em",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Resume
            </button>
          )}

          <button
            onClick={() => onStop(timer)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              borderRadius: "var(--radius-md)",
              padding: "0.5rem 1rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "white",
              background: "var(--danger)",
              border: "none",
              boxShadow: "0 2px 10px var(--danger-soft)",
              letterSpacing: "-0.01em",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
            </svg>
            Stop & save
          </button>

          <button
            onClick={() => onCancel(timer.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              borderRadius: "var(--radius-md)",
              padding: "0.5rem 1rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "var(--foreground)",
              background: "var(--surface-soft)",
              border: "1px solid var(--border)",
              letterSpacing: "-0.01em",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
