import { ThemeToggle } from "./ThemeToggle";

type HeaderProps = {
  email?: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onSignOut: () => void;
};

export function Header({ email, theme, onToggleTheme, onSignOut }: HeaderProps) {
  const initials = email ? email.slice(0, 2).toUpperCase() : "BT";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        borderBottom: "1px solid var(--border-soft)",
        background: "color-mix(in srgb, var(--surface-elevated) 82%, transparent)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      <div
        style={{
          maxWidth: "88rem",
          margin: "0 auto",
          padding: "0 1.25rem",
          height: "3.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div
            className="logo-mark"
            style={{
              width: "2rem",
              height: "2rem",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <line x1="12" y1="6" x2="12" y2="12">
    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="10s" repeatCount="indefinite"/>
  </line>
  <line x1="12" y1="12" x2="16" y2="14">
    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="60s" repeatCount="indefinite"/>
  </line>
</svg>
          </div>
          <div style={{ lineHeight: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "1rem",
                letterSpacing: "-0.04em",
                color: "var(--foreground)",
              }}
            >
              It's{" "}
              <span style={{ color: "var(--primary)" }}>BluTime</span>
            </div>
          </div>
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />

          {email && (
            <div
              className="hidden sm:flex"
              style={{
                alignItems: "center",
                gap: "0.5rem",
                borderRadius: "var(--radius-md)",
                border: "1.5px solid var(--border-soft)",
                background: "var(--surface-soft)",
                padding: "0.3rem 0.65rem 0.3rem 0.4rem",
              }}
            >
              <div
                style={{
                  width: "1.5rem",
                  height: "1.5rem",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--primary), var(--accent))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.6rem",
                  fontWeight: 800,
                  color: "white",
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 500, maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {email}
              </span>
            </div>
          )}

          <button
            onClick={onSignOut}
            style={{
              borderRadius: "var(--radius-md)",
              padding: "0.4rem 0.85rem",
              fontSize: "0.78rem",
              fontWeight: 600,
              background: "var(--surface-soft)",
              border: "1.5px solid var(--border)",
              color: "var(--foreground-secondary)",
              letterSpacing: "0.01em",
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}