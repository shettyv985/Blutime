"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

type TeamMember = {
  id: string;
  name: string;
  departmentName: string | null;
  hasBasecampId: boolean;
};

type TeamBasecampTask = {
  id: string;
  title: string;
  appUrl: string | null;
  dueOn: string | null;
  projectId: string | null;
  projectName: string;
  parentId: string | null;
  parentTitle: string | null;
  isChild: boolean;
  overdue: boolean;
  dueStatus?: "overdue" | "today" | "upcoming" | "undated";
};

type ActiveWork = {
  id: string;
  userName: string;
  clientName: string;
  categoryName: string;
  taskTitle: string;
  startedAt: string;
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
  nokkScore: number | null;
  startedAt: string;
  endedAt: string;
  totalSeconds: number;
};

type DashboardProps = {
  user: DashboardUser;
  categoryCount: number;
  departmentCount: number;
  departments: DepartmentOption[];
  users: ManagedUser[];
  teamMembers: TeamMember[];
  canManageUsers: boolean;
  canManagePlanner: boolean;
  canUseAiBrain: boolean;
  canViewCompanyDashboard: boolean;
  activeWork: ActiveWork[];
  todayLogs: TodayLog[];
};

type DashboardModule = "reports" | "planner" | "tasks" | "team" | "users" | "ai";
type TeamTaskView = "basecamp" | "planner";

const plannerMonthStorageKey = "blu-time-planner-month";
const teamPinStorageKey = "blu-time-team-pins";

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
  team:    { icon: "ti-search",         description: "Search people and open their tasks" },
  users:   { icon: "ti-users",          description: "Create & edit employee logins" },
  ai:      { icon: "ti-brain",          description: "Ask across BluTime data" },
};

function isAccountManagerDepartment(departmentName: string | null) {
  return departmentName?.toLowerCase().includes("account manager") ?? false;
}

function teamTaskToneClass(task: TeamBasecampTask) {
  if (task.dueStatus === "overdue" || task.overdue) return "task-tone-overdue";
  if (task.dueStatus === "today") return "task-tone-today";
  return "";
}

function teamTaskStatusClass(task: TeamBasecampTask) {
  if (task.dueStatus === "overdue" || task.overdue) return "task-status-overdue";
  if (task.dueStatus === "today") return "task-status-today";
  return "border-[var(--border-soft)] text-muted";
}

function teamTaskStatusLabel(task: TeamBasecampTask) {
  if (task.dueStatus === "overdue" || task.overdue) return "Overdue";
  if (task.dueStatus === "today") return "Due today";
  if (task.dueStatus === "upcoming") return "Upcoming";
  return "No due date";
}

export function BluTimeDashboard({
  user,
  categoryCount,
  departmentCount,
  departments,
  users,
  teamMembers,
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
  const isAccountManager = isAccountManagerDepartment(user.departmentName);
  const showPersonalPlannerHighlights = isEmployeeOnly && !isAccountManager;
  const showModuleNavigation = !isEmployeeOnly || isAccountManager;
  const employeePlannerItems = getEmployeePlannerItems(employeePlannerMonth, user.name, user.departmentName);

  const modules: Array<{ id: DashboardModule; label: string }> = [
    ...(canViewCompanyDashboard ? [{ id: "reports" as const, label: "Reports" }] : []),
    ...(canManagePlanner || isAccountManager ? [{ id: "planner" as const, label: "Planner" }] : []),
    ...(showModuleNavigation && (hasBasecampId || isAccountManager) ? [{ id: "tasks" as const, label: "Tasks" }] : []),
    ...(canManagePlanner || isAccountManager ? [{ id: "team" as const, label: "Team" }] : []),
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
          {showPersonalPlannerHighlights ? (
            <EmployeePlannerHighlights
              departmentName={user.departmentName}
              items={employeePlannerItems}
              monthKey={employeePlannerMonth}
              onMonthChange={changeEmployeePlannerMonth}
            />
          ) : showModuleNavigation ? (
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
          ) : null}
        </div>

        {canViewCompanyDashboard ? (
          <CompanyTodayOverview activeWork={activeWork} todayLogs={todayLogs} />
        ) : null}

        {showPersonalPlannerHighlights ? <BasecampTaskPreview hasBasecampId={hasBasecampId} /> : null}
        {activeModule === "tasks" ? <BasecampTaskPreview hasBasecampId={hasBasecampId} /> : null}

        <EmployeeTimerPanel hasBasecampId={hasBasecampId} showRecentLogs={false} />

        <EmployeeLogsPanel />

        {activeModule === "reports" ? <AdminReportsPanel /> : null}
        {activeModule === "planner" ? <PlannerFoundationPanel /> : null}
        {activeModule === "team" ? (
          <TeamTasksPanel
            members={teamMembers}
            monthKey={employeePlannerMonth}
            onMonthChange={changeEmployeePlannerMonth}
          />
        ) : null}
        {activeModule === "users"   ? <UserManagementPanel departments={departments} users={users} /> : null}
        {activeModule === "ai"      ? <AiMasterBrainPanel /> : null}
      </section>
    </main>
  );
}

function PlannerTaskCards({ emptyText, items }: { emptyText: string; items: EmployeePlannerItem[] }) {
  return items.length > 0 ? (
    <div className="scroll-area mt-5 grid max-h-[520px] gap-3 overflow-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
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
      {emptyText}
    </div>
  );
}

function TeamTasksPanel({
  members,
  monthKey,
  onMonthChange,
}: {
  members: TeamMember[];
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<TeamTaskView | null>(null);
  const [pinnedMemberIds, setPinnedMemberIds] = useState<string[]>([]);
  const [tasks, setTasks] = useState<TeamBasecampTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskMessage, setTaskMessage] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const matchedMembers = useMemo(() => {
    const source = members;
    if (!normalizedQuery) return [];

    return source
      .filter((member) =>
        `${member.name} ${member.departmentName ?? ""}`.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 20);
  }, [normalizedQuery, members]);
  const pinnedMembers = members.filter((member) => pinnedMemberIds.includes(member.id));
  const selectedMember = members.find((member) => member.id === selectedMemberId) ?? null;
  const selectedPlannerTasks =
    selectedMember && selectedView === "planner"
      ? getEmployeePlannerItems(monthKey, selectedMember.name, selectedMember.departmentName)
      : [];
  const taskCounts = {
    overdue: tasks.filter((task) => task.dueStatus === "overdue" || task.overdue).length,
    today: tasks.filter((task) => task.dueStatus === "today").length,
    upcoming: tasks.filter((task) => task.dueStatus === "upcoming").length,
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const parsed = JSON.parse(window.localStorage.getItem(teamPinStorageKey) ?? "[]") as string[];
      if (Array.isArray(parsed)) {
        setPinnedMemberIds(parsed.filter((id) => members.some((member) => member.id === id)));
      }
    } catch {
      setPinnedMemberIds([]);
    }
  }, [members]);

  useEffect(() => {
    let cancelled = false;

    async function loadMemberTasks(member: TeamMember) {
      setLoadingTasks(true);
      setTaskMessage("");
      setTasks([]);

      const response = await fetch(`/api/basecamp/tasks?userId=${encodeURIComponent(member.id)}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as {
        tasks?: TeamBasecampTask[];
        warning?: string;
        error?: string;
      } | null;

      if (cancelled) return;

      setLoadingTasks(false);
      setTasks(payload?.tasks ?? []);
      setTaskMessage(payload?.error ?? payload?.warning ?? "");
    }

    if (!selectedMember || selectedView !== "basecamp") {
      setTasks([]);
      setTaskMessage("");
      setLoadingTasks(false);
      return;
    }

    void loadMemberTasks(selectedMember);

    return () => {
      cancelled = true;
    };
  }, [selectedMember?.id, selectedView]);

  function openMember(member: TeamMember, view: TeamTaskView) {
    setSelectedMemberId(member.id);
    setSelectedView(view);
  }

  function togglePinnedMember(member: TeamMember) {
    setPinnedMemberIds((current) => {
      const next = current.includes(member.id)
        ? current.filter((id) => id !== member.id)
        : [...current, member.id];

      if (typeof window !== "undefined") {
        window.localStorage.setItem(teamPinStorageKey, JSON.stringify(next));
      }

      return next;
    });
  }

  function memberActionCard(member: TeamMember, source: "pinned" | "search") {
    const selected = selectedMember?.id === member.id;
    const pinned = pinnedMemberIds.includes(member.id);

    return (
      <article
        key={`${source}-${member.id}`}
        className={`module-theme-item flex flex-col gap-3 border px-4 py-3 ${selected ? "team-member-selected" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate text-base text-[var(--foreground)]">{member.name}</span>
            <span className="mt-1 block font-mono text-xs uppercase tracking-[0.12em] text-muted">
              {member.departmentName ?? "Team member"}{member.hasBasecampId ? "" : " / no Basecamp ID"}
            </span>
          </span>
          <button
            type="button"
            onClick={() => togglePinnedMember(member)}
            title={pinned ? "Unpin" : "Pin"}
            className={`rounded-full border px-3 py-2 text-xs ${pinned ? "border-[var(--accent-breeze)] text-[var(--accent-breeze)]" : "border-[var(--border-soft)] text-muted"}`}
            aria-label={pinned ? `Unpin ${member.name}` : `Pin ${member.name}`}
          >
            <i className="ti ti-pin" aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openMember(member, "basecamp")}
            className="rounded-full border border-[var(--border-soft)] px-3 py-2 text-xs text-muted"
          >
            Basecamp tasks
          </button>
          <button
            type="button"
            onClick={() => openMember(member, "planner")}
            className="rounded-full border border-[var(--border-soft)] px-3 py-2 text-xs text-muted"
          >
            Planner tasks
          </button>
        </div>
      </article>
    );
  }

  return (
    <section className="module-theme-panel mt-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Team</p>
          <h2 className="mt-2 text-3xl font-normal">Search team tasks</h2>
          <p className="mt-2 text-base text-muted">Search a person, then open Basecamp tasks or planner tasks.</p>
        </div>
        {selectedView === "basecamp" ? (
          <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border px-3 py-2 task-status-overdue">{taskCounts.overdue} overdue</span>
          <span className="rounded-full border px-3 py-2 task-status-today">{taskCounts.today} today</span>
          <span className="rounded-full border border-[var(--border-soft)] px-3 py-2 text-muted">{taskCounts.upcoming} upcoming</span>
        </div>
        ) : selectedView === "planner" ? (
          <input
            type="month"
            value={monthKey}
            onChange={(event) => onMonthChange(event.target.value)}
            className="max-w-56 border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          />
        ) : null}
      </div>

      <div className="mt-5">
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedMemberId(null);
            setSelectedView(null);
          }}
          placeholder="Search Durga, Bibin, Lekshmi, Anandu..."
          className="w-full border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base"
        />
      </div>

      {pinnedMembers.length > 0 ? (
        <div className="mt-5">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Pinned</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {pinnedMembers.map((member) => memberActionCard(member, "pinned"))}
          </div>
        </div>
      ) : null}

      {normalizedQuery ? (
        <div className="mt-5">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Search results</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {matchedMembers.map((member) => memberActionCard(member, "search"))}
          </div>
        </div>
      ) : null}

      {normalizedQuery && matchedMembers.length === 0 ? (
        <div className="mt-5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 text-muted">
          No team member found for this search.
        </div>
      ) : null}

      {selectedMember ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Opened member</p>
              <h3 className="mt-2 text-2xl font-normal">{selectedMember.name}</h3>
              <p className="mt-1 text-base text-muted">{selectedMember.departmentName ?? "Team member"}</p>
            </div>
            {selectedView === "basecamp" ? (
              <span className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm text-muted">
                {tasks.length} Basecamp tasks
              </span>
            ) : null}
            {selectedView === "planner" ? (
              <span className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm text-muted">
                {selectedPlannerTasks.length} planner tasks
              </span>
            ) : null}
          </div>

          {selectedView === "basecamp" ? (
            <>
              {loadingTasks ? <p className="mt-4 text-sm text-muted">Loading Basecamp tasks...</p> : null}
              {taskMessage ? <p className="mt-4 text-sm text-muted">{taskMessage}</p> : null}

              {!loadingTasks && !taskMessage && tasks.length === 0 ? (
                <div className="mt-5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 text-muted">
                  No assigned Basecamp tasks found for this person.
                </div>
              ) : null}

              {tasks.length > 0 ? (
                <div className="mt-5 grid gap-3">
                  {tasks.map((task) => (
                    <article
                      key={`${task.projectId ?? "project"}-${task.id}-${task.parentId ?? "parent"}`}
                      className={`module-theme-item border border-[var(--border)] p-5 ${teamTaskToneClass(task)}`}
                    >
                      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                            <span>{task.projectName}</span>
                            <span className={`rounded-full border px-2 py-1 ${teamTaskStatusClass(task)}`}>
                              {teamTaskStatusLabel(task)}{task.dueOn ? `: ${task.dueOn}` : ""}
                            </span>
                            {task.isChild ? <span>Child step</span> : null}
                          </div>
                          <h4 className="mt-3 text-2xl font-normal">{task.title}</h4>
                          {task.parentTitle ? <p className="mt-1 text-sm text-muted">{task.parentTitle}</p> : null}
                        </div>

                        {task.appUrl ? (
                          <a
                            href={task.appUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block rounded-full border border-[var(--border)] px-4 py-2 text-sm lg:justify-self-end"
                          >
                            Open in Basecamp
                          </a>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          {selectedView === "planner" ? (
            <PlannerTaskCards
              items={selectedPlannerTasks}
              emptyText="No planner rows found for this person in this month."
            />
          ) : null}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 text-muted">
          Search a name, or use a pinned person, then choose Basecamp tasks or Planner tasks.
        </div>
      )}
    </section>
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
        <PlannerTaskCards items={items} emptyText="No planner rows found for this month." />
      ) : (
        <div className="mt-5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4 text-muted">
          No planner rows found for this month.
        </div>
      )}
    </div>
  );
}
