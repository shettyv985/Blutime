"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    setLoading(false);

    if (!response.ok) {
      setError(payload?.error ?? "Could not sign in.");
      return;
    }

    router.refresh();
  }

  return (
    <main
      className="login-grid-page min-h-screen flex items-center justify-center px-5 py-10"
      style={{
        background: "#0a0a0a",
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glows */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,122,23,0.07) 0%, transparent 65%)",
          top: -160,
          left: -140,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 65%)",
          bottom: -120,
          right: -100,
          pointerEvents: "none",
        }}
      />

      {/* Card */}
      <section
        className="relative z-10 w-full"
        style={{ maxWidth: 420 }}
      >
        <div
          className="login-grid-card"
          style={{
            background: "#111113",
            border: "1px solid #242428",
            borderRadius: 12,
            padding: "40px 36px 36px",
          }}
        >
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <picture>
                <source srcSet="https://fonts.gstatic.com/s/e/notoemoji/latest/231b/512.webp" type="image/webp" />
                <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/231b/512.gif" alt="hourglass" width="22" height="22" style={{ display: "block" }} />
              </picture>
              <span
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "2.2px",
                  textTransform: "uppercase",
                  color: "#ffffff",
                }}
              >
                It's BluTime
              </span>
            </div>
            <span
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 10,
                letterSpacing: "1px",
                textTransform: "uppercase",
                color: "#3a3a40",
              }}
            >
              v1.0
            </span>
          </div>

          {/* Hairline divider */}
          <div
            style={{
              height: 1,
              background: "linear-gradient(90deg, transparent, #242428 20%, #242428 80%, transparent)",
              marginBottom: 28,
            }}
          />

          {/* Eyebrow */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ width: 20, height: 1, background: "#3a3a40", flexShrink: 0 }} />
            <span
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 11,
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                  color: "rgba(255,255,255,0.72)",
              }}
            >
              Secure access
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 42,
              fontWeight: 300,
              lineHeight: 1.05,
              letterSpacing: "-1.5px",
              color: "#ffffff",
              margin: "0 0 8px",
            }}
          >
            Sign in
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.6,
              margin: "0 0 28px",
            }}
          >
            Use the company email and password created by admin.
          </p>

          <form onSubmit={submitLogin}>
            {/* Email */}
            <label style={{ display: "block", marginBottom: 16 }}>
              <span
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 10,
                  letterSpacing: "1.3px",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.78)",
                  display: "block",
                  marginBottom: 7,
                }}
              >
                Email address
              </span>
              <input
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  type="email"
  autoComplete="email"
  placeholder="you@company.com"
  required
  style={{
    width: "100%",
    background: "#0d0d0f",
    border: "1px solid #242428",
    borderRadius: 8,
    padding: "11px 14px",
    fontSize: 16,           // ← was 14, must be ≥16 to prevent mobile zoom
    color: "#e8e8ec",
    outline: "none",
    boxSizing: "border-box" as const,
    letterSpacing: "0.2px",
    fontFamily: "inherit",
  }}
/>
            </label>

            {/* Password */}
            <label style={{ display: "block", marginBottom: 16 }}>
              <span
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 10,
                  letterSpacing: "1.3px",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.78)",
                  display: "block",
                  marginBottom: 7,
                }}
              >
                Password
              </span>
              <div style={{ position: "relative" }}>
                <input
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  type={showPassword ? "text" : "password"}
  autoComplete="current-password"
  placeholder="••••••••••"
  required
  style={{
    width: "100%",
    background: "#0d0d0f",
    border: "1px solid #242428",
    borderRadius: 8,
    padding: "11px 42px 11px 14px",
    fontSize: 16,           // ← was 14, must be ≥16 to prevent mobile zoom
    color: "#e8e8ec",
    outline: "none",
    boxSizing: "border-box" as const,
    letterSpacing: "0.2px",
    fontFamily: "inherit",
  }}
/>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle password visibility"
                  style={{
                    position: "absolute",
                    right: 13,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: "#3a3a40",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </label>

            {error && (
              <div
                style={{
                  background: "rgba(255,122,23,0.06)",
                  border: "1px solid rgba(255,122,23,0.2)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.3px",
                  color: "#ffc285",
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "#ffffff",
                color: "#0a0a0a",
                border: "none",
                borderRadius: 9999,
                padding: "13px 16px",
                fontSize: 14,
                fontWeight: 400,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.35 : 1,
                marginTop: 8,
                letterSpacing: "0.2px",
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Footer */}
          <div style={{ marginTop: 22, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#2e2e34" }} />
            <span
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 10,
                letterSpacing: "1px",
                textTransform: "uppercase",
                color: "#2e2e34",
              }}
            >
              Company credentials only
            </span>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#2e2e34" }} />
          </div>
        </div>
      </section>
    </main>
  );
}
