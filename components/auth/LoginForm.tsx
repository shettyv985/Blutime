"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 text-[var(--foreground)]">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-[480px] flex-col justify-center">
        <div className="premium-panel p-8 sm:p-10">
          <div className="flex items-center gap-3 font-mono text-xs text-muted">
            <picture>
              <source srcSet="https://fonts.gstatic.com/s/e/notoemoji/latest/231b/512.webp" type="image/webp" />
              <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/231b/512.gif" alt="hourglass" width="32" height="32" />
            </picture>
            <span>It&apos;s BluTime</span>
          </div>
          <h1 className="mt-4 text-5xl font-normal">Sign in</h1>
          <p className="mt-2 text-base text-muted">
            Use the company email and password created by admin.
          </p>

          <form onSubmit={submitLogin} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-base font-semibold">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                className="mt-2 w-full border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-lg outline-none"
                required
              />
            </label>

            <label className="block">
              <span className="text-base font-semibold">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                className="mt-2 w-full border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-lg outline-none"
                required
              />
            </label>

            {error ? (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-base text-red-300">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--primary)] px-4 py-3 text-lg disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
