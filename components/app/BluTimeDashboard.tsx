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

  const modules: Array<{ id: DashboardModule; label: string; description: string }> = [
    ...(canViewCompanyDashboard
      ? [{ id: "reports" as const, label: "Reports", description: "Work logs, filters, and PDF export." }]
      : []),
    ...(canManagePlanner
      ? [{ id: "planner" as const, label: "Planner", description: "Month-wise pod plan and CSV." }]
      : []),
    ...(!isEmployeeOnly && hasBasecampId
      ? [{ id: "tasks" as const, label: "Basecamp tasks", description: "Today and overdue assigned tasks." }]
      : []),
    ...(canManageUsers
      ? [{ id: "users" as const, label: "Users", description: "Create and edit employee logins." }]
      : []),
    ...(canUseAiBrain
      ? [{ id: "ai" as const, label: "AI", description: "Ask across BluTime data and approved sheets." }]
      : []),
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
      <header className="app-header sticky top-0 z-40 border-b border-[var(--border-soft)] bg-[var(--background)]/95 backdrop-blur-xl">
        <div className="m-stripe" />
        <div className="mx-auto flex max-w-[1680px] items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <div className="machined-label flex items-center gap-3 text-[var(--muted-light)]">
              <span>It&apos;s</span>
            </div>
            <h1 className="mt-1 flex items-center gap-3 text-3xl font-normal sm:text-5xl">
              <span>BluTime</span>
              <picture className="inline-flex">
                <source srcSet="https://fonts.gstatic.com/s/e/notoemoji/latest/231b/512.webp" type="image/webp" />
                <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/231b/512.gif" alt="hourglass" width="32" height="32" />
              </picture>
            </h1>
          </div>
          <button
            onClick={logout}
            disabled={loggingOut}
            className="border border-[var(--border-strong)] px-5 py-3 text-base disabled:opacity-60"
          >
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-[1680px] px-5 py-7 sm:px-8">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="premium-panel p-6">
  <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Signed in as</p>
  <EmployeeLanyardBadge
    departmentName={user.departmentName}
    email={user.email}
    name={user.name}
    photoUrl={user.photoUrl}
  />
</div>

          {isEmployeeOnly ? (
            <EmployeePlannerHighlights
              departmentName={user.departmentName}
              items={employeePlannerItems}
              monthKey={employeePlannerMonth}
              onMonthChange={changeEmployeePlannerMonth}
            />
          ) : (
            <>
              <div className="premium-panel p-6">
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Access role</p>
                <h2 className="mt-3 text-2xl font-normal">{user.accessRole}</h2>
              </div>

              <div className="premium-panel p-6">
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">System foundation</p>
                <h2 className="mt-3 text-2xl font-normal">
                  {departmentCount} departments / {categoryCount} categories
                </h2>
              </div>
            </>
          )}
        </div>

        {canViewCompanyDashboard ? (
          <CompanyTodayOverview activeWork={activeWork} todayLogs={todayLogs} />
        ) : null}

        <EmployeeTimerPanel hasBasecampId={hasBasecampId} showRecentLogs={!isEmployeeOnly} />

        {isEmployeeOnly ? <BasecampTaskPreview hasBasecampId={hasBasecampId} /> : null}
        {isEmployeeOnly ? <EmployeeLogsPanel /> : null}

        {modules.length > 0 ? (
          <section className="card mt-5 p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase text-muted">navigation</p>
                <h2 className="mt-2 text-4xl font-normal">Open a module</h2>
                <p className="mt-2 text-base text-muted">
                  Everything extra stays hidden until you need it.
                </p>
              </div>
              {activeModule ? (
                <button
                  type="button"
                  onClick={() => setActiveModule(null)}
                  className="border border-[var(--border)] px-5 py-3 text-base"
                >
                  Close module
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {modules.map((module) => {
                const selected = activeModule === module.id;

                return (
                  <button
                    key={module.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setActiveModule((current) => (current === module.id ? null : module.id))}
                    className={`border px-7 py-6 text-center ${
                      selected
                        ? "border-[var(--border-strong)] bg-[var(--surface-soft)]"
                        : "border-[var(--border)] bg-transparent"
                    }`}
                  >
                    <span className="block text-xl text-center">{module.label}</span>
                    <span className="mt-2 block text-sm text-muted text-center">{module.description}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {activeModule === "reports" ? <AdminReportsPanel /> : null}
        {activeModule === "planner" ? <PlannerFoundationPanel /> : null}
        {activeModule === "tasks" ? <BasecampTaskPreview hasBasecampId={hasBasecampId} /> : null}
        {activeModule === "users" ? <UserManagementPanel departments={departments} users={users} /> : null}
        {activeModule === "ai" ? <AiMasterBrainPanel /> : null}
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
              <p className="mt-1 text-sm">
                {item.service} / {item.podName} / {item.weekName}
              </p>
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
