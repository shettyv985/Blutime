"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AiMasterBrainPanel } from "@/components/admin/AiMasterBrainPanel";
import { AdminReportsPanel } from "@/components/admin/AdminReportsPanel";
import { CompanyTodayOverview } from "@/components/admin/CompanyTodayOverview";
import { PlannerFoundationPanel } from "@/components/admin/PlannerFoundationPanel";
import { getEmployeePlannerItems, type EmployeePlannerItem } from "@/components/admin/PodRoutinePlannerPanel";
import { UserManagementPanel } from "@/components/admin/UserManagementPanel";
import { EmployeeLanyardBadge } from "@/components/app/EmployeeLanyardBadge";
import { BasecampTaskPreview } from "@/components/tasks/BasecampTaskPreview";
import { EmployeeLogsPanel } from "@/components/timers/EmployeeLogsPanel";
import { EmployeeTimerPanel } from "@/components/timers/EmployeeTimerPanel";

type DashboardUser = {
  name: string;
  email: string;
  accessRole: string;
  departmentName: string | null;
  basecampPersonId: string | null;
  photoUrl: string | null;
};

type DepartmentOption = {
  id: string;
  name: string;
  slug: string;
};

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  accessRole: string;
  departmentId: string | null;
  departmentName: string | null;
  basecampPersonId: string | null;
  photoUrl: string | null;
  isActive: boolean;
};

type ActiveWork = {
  id: string;
  userName: string;
  clientName: string;
  categoryName: string;
  taskTitle: string;
  status: string;
  elapsedSeconds: number;
};

type TodayLog = {
  id: string;
  userName: string;
  clientName: string;
  categoryName: string;
  taskTitle: string;
  outputSummary: string;
  totalSeconds: number;
};

type DashboardProps = {
  user: DashboardUser;
  categoryCount: number;
  departmentCount: number;
  departments: DepartmentOption[];
  users: ManagedUser[];
  canManageUsers: boolean;
  canManagePlanner: boolean;
  canUseAiBrain: boolean;
  canViewCompanyDashboard: boolean;
  activeWork: ActiveWork[];
  todayLogs: TodayLog[];
};

type DashboardModule = "reports" | "planner" | "tasks" | "users" | "ai";

const plannerMonthStorageKey = "blu-time-planner-month";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function isValidMonthKey(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

function initialPlannerMonthKey() {
  if (typeof window === "undefined") return currentMonthKey();
  const monthFromUrl = new URLSearchParams(window.location.search).get("plannerMonth");
  if (isValidMonthKey(monthFromUrl)) return monthFromUrl as string;
  const monthFromStorage = window.localStorage.getItem(plannerMonthStorageKey);
  if (isValidMonthKey(monthFromStorage)) return monthFromStorage as string;
  return currentMonthKey();
}

function persistPlannerMonthKey(monthKey: string) {
  if (typeof window === "undefined" || !isValidMonthKey(monthKey)) return;
  window.localStorage.setItem(plannerMonthStorageKey, monthKey);
  const url = new URL(window.location.href);
  url.searchParams.set("plannerMonth", monthKey);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

const MODULE_META = {
  reports: { icon: "ti-chart-bar",      description: "Work logs, filters & PDF export" },
  planner: { icon: "ti-calendar-month", description: "Month-wise pod plan & CSV" },
  tasks:   { icon: "ti-check",          description: "Today and overdue tasks" },
  users:   { icon: "ti-users",          description: "Create & edit employee logins" },
  ai:      { icon: "ti-brain",          description: "Ask across BluTime data" },
};

export function BluTimeDashboard({
  user,
  categoryCount,
  departmentCount,
  departments,
  users,
  canManageUsers,
  canManagePlanner,
  canUseAiBrain,
  canViewCompanyDashboard,
  activeWork,
  todayLogs,
}: DashboardProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeModule, setActiveModule] = useState<DashboardModule | null>(null);
  const [employeePlannerMonth, setEmployeePlannerMonth] = useState(currentMonthKey());
  const hasBasecampId = Boolean(user.basecampPersonId);
  const isEmployeeOnly =
    !canViewCompanyDashboard && !canManagePlanner && !canManageUsers && !canUseAiBrain;
  const employeePlannerItems = getEmployeePlannerItems(employeePlannerMonth, user.name, user.departmentName);

  const modules: Array<{ id: DashboardModule; label: string }> = [
    ...(canViewCompanyDashboard ? [{ id: "reports" as const, label: "Reports" }] : []),
    ...(canManagePlanner        ? [{ id: "planner" as const, label: "Planner" }] : []),
    ...(!isEmployeeOnly && hasBasecampId ? [{ id: "tasks" as const, label: "Tasks" }] : []),
    ...(canManageUsers          ? [{ id: "users"   as const, label: "Users"   }] : []),
    ...(canUseAiBrain           ? [{ id: "ai"      as const, label: "AI"      }] : []),
  ];

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  }

  useEffect(() => {
    setEmployeePlannerMonth(initialPlannerMonthKey());
  }, []);

  function changeEmployeePlannerMonth(nextMonthKey: string) {
    if (!isValidMonthKey(nextMonthKey)) return;
    setEmployeePlannerMonth(nextMonthKey);
    persistPlannerMonthKey(nextMonthKey);
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">

      {/* ── Header ── */}
      <header
        style={{
          position: "sticky", top: 0, zIndex: 40, height: "60px",
          borderBottom: "1px solid #1e1e22",
          background: "rgba(10,10,10,0.94)",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 1.25rem", gap: "12px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: "9px", letterSpacing: "1.8px", textTransform: "uppercase", color: "#ffffff", lineHeight: 1 }}>
            It&apos;s
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(16px, 3vw, 20px)", fontWeight: 600, letterSpacing: "-0.05em", color: "#ffffff", lineHeight: 1 }}>
              <span style={{ color: "#004fc5" }}>Blu</span>Time
            </span>
            <picture style={{ display: "inline-flex", alignItems: "center" }}>
              <source srcSet="https://fonts.gstatic.com/s/e/notoemoji/latest/231b/512.webp" type="image/webp" />
              <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/231b/512.gif" alt="hourglass" width="20" height="20" style={{ display: "block" }} />
            </picture>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", background: "#111113", border: "1px solid #242428", borderRadius: "9999px", padding: "4px 4px" }} className="user-pill">
            <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "linear-gradient(135deg, #FFFFFF, #002761)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 700, color: "white", letterSpacing: "0.5px", flexShrink: 0 }}>
              {user.email.slice(0, 2).toUpperCase()}
            </div>
            <span className="hidden sm:block" style={{ fontSize: "12px", color: "rgba(255,255,255,0.74)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: "8px" }}>
              {user.email}
            </span>
          </div>
          <button
            onClick={logout}
            disabled={loggingOut}
            style={{ background: "transparent", border: "1px solid #242428", borderRadius: "9999px", padding: "7px clamp(10px, 2vw, 18px)", fontFamily: "'Geist Mono', monospace", fontSize: "clamp(9px, 1.5vw, 10px)", letterSpacing: "1px", textTransform: "uppercase", color: "rgba(255,255,255,0.82)", cursor: loggingOut ? "not-allowed" : "pointer", opacity: loggingOut ? 0.35 : 1, transition: "border-color 0.15s, color 0.15s", whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-[1680px] px-5 py-7 sm:px-8">
        <div className="grid gap-3 md:grid-cols-3">

          {/* ── Col 1 — Lanyard card — subtle grid ── */}
          <div style={{ position: "relative", background: "#080a0f", border: "1px solid #1a1d28", borderRadius: "12px", overflow: "hidden" }}>

            {/* Subtle grid texture */}
            <svg
              aria-hidden="true"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
              preserveAspectRatio="xMidYMid slice"
              viewBox="0 0 400 500"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="c1-minor" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
                  <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="0.35"/>
                </pattern>
                <pattern id="c1-major" x="0" y="0" width="36" height="36" patternUnits="userSpaceOnUse">
                  <rect width="36" height="36" fill="url(#c1-minor)"/>
                </pattern>
                <radialGradient id="c1-glow" cx="25%" cy="20%" r="55%">
                  <stop offset="0%" stopColor="#a0c3ec" stopOpacity="0.035"/>
                  <stop offset="100%" stopColor="#a0c3ec" stopOpacity="0"/>
                </radialGradient>
              </defs>
              <rect width="400" height="500" fill="url(#c1-major)" opacity="0.22"/>
              <rect width="400" height="500" fill="url(#c1-glow)"/>
            </svg>

            {/* Header row */}
            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 14, height: 1, background: "#2e2e38" }} />
                <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.76)" }}>Signed in as</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1a6e3a", boxShadow: "0 0 6px rgba(26,110,58,0.8)" }} />
                <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 9, letterSpacing: "1px", textTransform: "uppercase", color: "#1d8a49" }}>Active</span>
              </div>
            </div>

            {/* Name + dept */}
            <div style={{ position: "relative", zIndex: 1, padding: "10px 20px 0" }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 600, letterSpacing: "-0.04em", color: "#ffffff", lineHeight: 1.1 }}>{user.name}</div>
              <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, letterSpacing: "1.2px", textTransform: "uppercase", color: "rgba(255,255,255,0.72)", marginTop: 4 }}>{user.departmentName ?? "Team member"}</div>
            </div>

            <div className="lg:hidden" style={{ padding: "0 20px 20px" }} />
            <div className="hidden lg:block" style={{ position: "relative", zIndex: 1 }}>
              <EmployeeLanyardBadge departmentName={user.departmentName} email={user.email} name={user.name} photoUrl={user.photoUrl} />
            </div>
          </div>

          {/* ── Cols 2–3 ── */}
          {isEmployeeOnly ? (
            <EmployeePlannerHighlights
              departmentName={user.departmentName}
              items={employeePlannerItems}
              monthKey={employeePlannerMonth}
              onMonthChange={changeEmployeePlannerMonth}
            />
          ) : (
            <div
              className="md:col-span-2"
              style={{
                position: "relative",
                background: "#09080f",
                border: "1px solid #161b26",
                borderRadius: "14px",
                overflow: "hidden",
                padding: "26px 24px 22px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Subtle grid texture */}
              <svg
                aria-hidden="true"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
                preserveAspectRatio="xMidYMid slice"
                viewBox="0 0 700 340"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern id="c2-minor" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" strokeOpacity="0.11" strokeWidth="0.35"/>
                  </pattern>
                  <pattern id="c2-major" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                    <rect width="40" height="40" fill="url(#c2-minor)"/>
                  </pattern>
                  <radialGradient id="c2-glow" cx="78%" cy="82%" r="50%">
                    <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.03"/>
                    <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0"/>
                  </radialGradient>
                </defs>
                <rect width="700" height="340" fill="url(#c2-major)" opacity="0.2"/>
                <rect width="700" height="340" fill="url(#c2-glow)"/>
              </svg>

              {/* Eyebrow */}
              <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <span style={{ width: 18, height: 1, background: "#1e2535" }} />
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, letterSpacing: "2px", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.72)" }}>Navigation</span>
              </div>

              {/* Heading */}
              <div style={{ position: "relative", zIndex: 1, marginBottom: 22 }}>
                <h2 style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif", fontSize: 26, fontWeight: 400, letterSpacing: "-0.5px", color: "#e8ecf4", lineHeight: 1.05, margin: 0 }}>
                  Open a module
                </h2>
                <p style={{ fontFamily: "'Courier New', monospace", fontSize: 9, letterSpacing: "1.4px", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.68)", marginTop: 7 }}>
                  Everything extra stays hidden until you need it
                </p>
              </div>

              {/* Module rows */}
              {modules.length > 0 ? (
                <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  {modules.map((mod) => {
                    const meta = MODULE_META[mod.id];
                    const selected = activeModule === mod.id;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setActiveModule((cur) => (cur === mod.id ? null : mod.id))}
                        style={{
                          background: selected ? "rgba(0,32,80,0.28)" : "rgba(9,8,15,0.72)",
                          border: selected ? "1px solid rgba(0,79,197,0.4)" : "1px solid #161b26",
                          borderRadius: 10,
                          padding: "14px 16px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          position: "relative",
                          overflow: "hidden",
                          textAlign: "left",
                          width: "100%",
                          transition: "background 0.18s, border-color 0.18s, transform 0.12s",
                          backdropFilter: "blur(8px)",
                          WebkitBackdropFilter: "blur(8px)",
                        }}
                        onMouseEnter={(e) => {
                          if (!selected) {
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(196,181,253,0.04)";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "#1e1a2e";
                            (e.currentTarget as HTMLButtonElement).style.transform = "translateX(2px)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!selected) {
                            (e.currentTarget as HTMLButtonElement).style.background = "rgba(9,8,15,0.72)";
                            (e.currentTarget as HTMLButtonElement).style.borderColor = "#161b26";
                            (e.currentTarget as HTMLButtonElement).style.transform = "translateX(0)";
                          }
                        }}
                      >
                        {/* Left accent bar */}
                        <span style={{
                          position: "absolute", left: 0, top: 0, bottom: 0, width: 2,
                          background: selected ? "linear-gradient(180deg, #004fc5, #002050)" : "transparent",
                          borderRadius: "2px 0 0 2px",
                          transition: "background 0.2s",
                        }} />

                        {/* Icon */}
                        <span style={{
                          width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                          background: selected ? "#001535" : "rgba(9,8,15,0.9)",
                          border: selected ? "1px solid rgba(0,79,197,0.3)" : "1px solid #1a1528",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "background 0.18s, border-color 0.18s",
                        }}>
                          <i
                            className={`ti ${meta.icon}`}
                            aria-hidden="true"
                            style={{
                              fontSize: 18, display: "block", lineHeight: 1,
                          color: selected ? "#a0c3ec" : "rgba(255,255,255,0.82)",
                              transition: "color 0.18s",
                            }}
                          />
                        </span>

                        {/* Text */}
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{
                            display: "block",
                            fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                            fontSize: 14, fontWeight: 500, letterSpacing: "-0.2px",
                            color: "#ffffff",
                            lineHeight: 1, marginBottom: 4,
                            transition: "color 0.18s",
                          }}>
                            {mod.label}
                          </span>
                          <span style={{
                            display: "block",
                            fontFamily: "'Courier New', monospace",
                            fontSize: 9, letterSpacing: "0.8px", textTransform: "uppercase" as const,
                            color: selected ? "rgba(160,195,236,0.86)" : "rgba(255,255,255,0.66)",
                            lineHeight: 1.4,
                            transition: "color 0.18s",
                          }}>
                            {meta.description}
                          </span>
                        </span>

                        {/* Arrow */}
                        <span style={{
                          flexShrink: 0,
                          opacity: selected ? 1 : 0,
                          transform: selected ? "translateX(0)" : "translateX(-4px)",
                          transition: "opacity 0.18s, transform 0.18s",
                        }}>
                          <i className="ti ti-arrow-right" aria-hidden="true" style={{ fontSize: 14, color: "#2a4a8a", display: "block" }} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p style={{ position: "relative", zIndex: 1, fontFamily: "'Courier New', monospace", fontSize: 10, letterSpacing: "1px", color: "rgba(255,255,255,0.74)", textTransform: "uppercase" as const }}>
                  No modules available.
                </p>
              )}
            </div>
          )}
        </div>

        {canViewCompanyDashboard ? (
          <CompanyTodayOverview activeWork={activeWork} todayLogs={todayLogs} />
        ) : null}

        {isEmployeeOnly ? <BasecampTaskPreview hasBasecampId={hasBasecampId} /> : null}
        {activeModule === "tasks" ? <BasecampTaskPreview hasBasecampId={hasBasecampId} /> : null}

        <EmployeeTimerPanel hasBasecampId={hasBasecampId} showRecentLogs={!isEmployeeOnly} />

        {isEmployeeOnly ? <EmployeeLogsPanel /> : null}

        {activeModule === "reports" ? <AdminReportsPanel /> : null}
        {activeModule === "planner" ? <PlannerFoundationPanel /> : null}
        {activeModule === "users"   ? <UserManagementPanel departments={departments} users={users} /> : null}
        {activeModule === "ai"      ? <AiMasterBrainPanel /> : null}
      </section>
    </main>
  );
}

function EmployeePlannerHighlights({
  departmentName,
  items,
  monthKey,
  onMonthChange,
}: {
  departmentName: string | null;
  items: EmployeePlannerItem[];
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
}) {
  return (
    <div className="premium-panel p-6 md:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Planner dates</p>
          <h2 className="mt-3 text-2xl font-normal">{formatMonthLabel(monthKey)}</h2>
          <p className="mt-1 text-base text-muted">{departmentName ?? "Employee"} workbook tasks</p>
        </div>
        <input
          type="month"
          value={monthKey}
          onChange={(event) => onMonthChange(event.target.value)}
          className="max-w-56 border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
        />
      </div>

      {items.length > 0 ? (
        <div className="scroll-area mt-5 grid max-h-[360px] gap-3 overflow-auto pr-1 md:grid-cols-2">
          {items.map((item, index) => (
            <article
              key={`${item.podName}-${item.weekName}-${item.client}-${item.role}-${item.dateLabel}-${index}`}
              className={`planner-employee-card planner-employee-${item.role.toLowerCase()}${item.dueSoon ? " planner-employee-due-soon" : ""}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs uppercase">{item.dateLabel}</span>
                <span className="rounded-full border border-current px-2 py-1 text-xs">{item.role}</span>
              </div>
              <h3 className="mt-3 text-xl font-normal">{item.client}</h3>
              <p className="mt-1 text-sm">{item.service} / {item.podName} / {item.weekName}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm">{item.task}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 text-muted">
          No planner rows found for this month.
        </div>
      )}
    </div>
  );
}
