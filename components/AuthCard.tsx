type AuthCardProps = {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSignIn: () => void;
  onSignUp: () => void;
};

export function AuthCard({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSignIn,
  onSignUp,
}: AuthCardProps) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        position: "relative",
      }}
    >
      {/* Ambient */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(29,78,216,0.12), transparent 60%), radial-gradient(ellipse 50% 50% at 80% 100%, rgba(147,51,234,0.08), transparent 55%)",
        }}
      />

<div
  style={{
    width: "100%",
    maxWidth: "23rem",
    position: "relative",
    margin: "0 auto",
  }}
>

        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            className="logo-mark"
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
            }}
          >
            <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <line x1="12" y1="6" x2="12" y2="12">
    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="10s" repeatCount="indefinite"/>
  </line>
  <line x1="12" y1="12" x2="16" y2="14">
    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="60s" repeatCount="indefinite"/>
  </line>
</svg>
          </div>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--primary)",
              marginBottom: "0.35rem",
            }}
          >
            Team Time Tracker
          </p>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2.25rem",
              fontWeight: 800,
              letterSpacing: "-0.05em",
              lineHeight: 1,
              color: "var(--foreground)",
              margin: 0,
            }}
          >
            It's <span style={{ color: "var(--primary)" }}>BluTime</span>
          </h1>
          <p
            style={{
              marginTop: "0.6rem",
              fontSize: "0.83rem",
              color: "var(--muted)",
              fontWeight: 400,
            }}
          >
            Sign in or create your employee account.
          </p>
        </div>

        {/* Card */}
        <div
          className="card"
          style={{
            borderRadius: "var(--radius-2xl)",
            padding: "clamp(1.1rem, 4vw, 1.75rem)",

          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {/* Email */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.4rem",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                }}
              >
                Email
              </label>
              <input
                className="field"
                placeholder="you@company.com"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.4rem",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                }}
              >
                Password
              </label>
              <input
                className="field"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            {/* Sign in */}
            <button
              onClick={onSignIn}
              style={{
                marginTop: "0.25rem",
                width: "100%",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                background: "linear-gradient(135deg, var(--primary), var(--primary-dim))",
                color: "white",
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "0.9rem",
                letterSpacing: "-0.02em",
                border: "none",
                boxShadow: "0 4px 20px var(--primary-glow-strong)",
              }}
            >
              Sign in →
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div className="divider" style={{ flex: 1 }} />
              <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 500 }}>or</span>
              <div className="divider" style={{ flex: 1 }} />
            </div>

            {/* Create account */}
            <button
              onClick={onSignUp}
              style={{
                width: "100%",
                padding: "0.65rem",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-soft)",
                border: "1.5px solid var(--border)",
                color: "var(--foreground)",
                fontWeight: 600,
                fontSize: "0.855rem",
              }}
            >
              Create account
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}