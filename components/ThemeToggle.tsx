"use client";

type ThemeToggleProps = {
  theme: "light" | "dark";
  onToggle: () => void;
};

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={onToggle}
      type="button"
      aria-label="Toggle theme"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.4rem 0.75rem",
        borderRadius: "var(--radius-md)",
        border: "1.5px solid var(--border-soft)",
        background: "var(--surface-soft)",
        color: "var(--muted)",
        fontSize: "0.78rem",
        fontWeight: 600,
        letterSpacing: "0.01em",
      }}
    >
      {theme === "dark" ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
          </svg>
          <span className="hidden sm:inline">Light</span>
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
          </svg>
          <span className="hidden sm:inline">Dark</span>
        </>
      )}
    </button>
  );
}