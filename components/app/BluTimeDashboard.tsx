"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AiMasterBrainPanel } from "@/components/admin/AiMasterBrainPanel";
import { AdminReportsPanel } from "@/components/admin/AdminReportsPanel";
import { CompanyTodayOverview } from "@/components/admin/CompanyTodayOverview";
import { PlannerFoundationPanel } from "@/components/admin/PlannerFoundationPanel";
import { UserManagementPanel } from "@/components/admin/UserManagementPanel";
import { BasecampTaskPreview } from "@/components/tasks/BasecampTaskPreview";
import { EmployeeLogsPanel } from "@/components/timers/EmployeeLogsPanel";
import { EmployeeTimerPanel } from "@/components/timers/EmployeeTimerPanel";

type DashboardUser = {
  name: string;
  email: string;
  accessRole: string;
  basecampPersonId: string | null;
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
  const hasBasecampId = Boolean(user.basecampPersonId);
  const isEmployeeOnly =
    !canViewCompanyDashboard && !canManagePlanner && !canManageUsers && !canUseAiBrain;

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

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-40 border-b border-[var(--border-soft)] bg-[var(--background)]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1680px] items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <div className="flex items-center gap-3 font-mono text-xs text-[var(--muted-light)]">
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
            <h2 className="mt-3 text-2xl font-normal">{user.name}</h2>
            <p className="mt-1 text-base text-muted">{user.email}</p>
          </div>

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
                    className={`border px-5 py-4 text-left ${
                      selected
                        ? "border-[var(--border-strong)] bg-[var(--surface-soft)]"
                        : "border-[var(--border)] bg-transparent"
                    }`}
                  >
                    <span className="block text-xl">{module.label}</span>
                    <span className="mt-2 block text-sm text-muted">{module.description}</span>
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
