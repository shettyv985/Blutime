import { and, asc, count, desc, eq, gte, inArray, isNull, lt } from "drizzle-orm";

import { BluTimeDashboard } from "@/components/app/BluTimeDashboard";
import { LoginForm } from "@/components/auth/LoginForm";
import { activeTimers, categories, clients, departments, timeEntries, users } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { canManagePlanner, canManageUsers, canUseAiMasterBrain, canViewCompanyDashboard } from "@/server/auth/permissions";
import { db } from "@/server/db/client";
import { todayRangeInIst } from "@/server/timers/day";
import { elapsedSeconds } from "@/server/timers/time";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return <LoginForm />;
  }

  const allowUserManagement = canManageUsers(user);
  const allowCompanyDashboard = canViewCompanyDashboard(user);
  const allowPlanner = canManagePlanner(user);
  const allowAiBrain = canUseAiMasterBrain(user);
  const todayRange = todayRangeInIst();

  const [[departmentTotal], [categoryTotal], departmentRows, userRows, activeWorkRows, todayLogRows] = await Promise.all([
    db.select({ value: count() }).from(departments),
    db.select({ value: count() }).from(categories),
    db
      .select({
        id: departments.id,
        name: departments.name,
        slug: departments.slug,
      })
      .from(departments)
      .where(eq(departments.isActive, true))
      .orderBy(asc(departments.name)),
    allowUserManagement
      ? db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            accessRole: users.accessRole,
            departmentId: users.departmentId,
            departmentName: departments.name,
            basecampPersonId: users.basecampPersonId,
            isActive: users.isActive,
          })
          .from(users)
          .leftJoin(departments, eq(users.departmentId, departments.id))
          .orderBy(asc(users.name))
      : Promise.resolve([]),
    allowCompanyDashboard
      ? db
          .select({
            id: activeTimers.id,
            userName: users.name,
            clientName: clients.name,
            categoryName: categories.name,
            taskTitle: activeTimers.taskTitle,
            runningSince: activeTimers.runningSince,
            elapsedBeforePauseSeconds: activeTimers.elapsedBeforePauseSeconds,
            status: activeTimers.status,
          })
          .from(activeTimers)
          .innerJoin(users, eq(activeTimers.userId, users.id))
          .innerJoin(clients, eq(activeTimers.clientId, clients.id))
          .innerJoin(categories, eq(activeTimers.categoryId, categories.id))
          .where(inArray(activeTimers.status, ["running", "paused"]))
          .orderBy(asc(users.name))
      : Promise.resolve([]),
    allowCompanyDashboard
      ? db
          .select({
            id: timeEntries.id,
            userName: users.name,
            clientName: clients.name,
            categoryName: categories.name,
            taskTitle: timeEntries.taskTitle,
            outputSummary: timeEntries.outputSummary,
            totalSeconds: timeEntries.totalSeconds,
            endedAt: timeEntries.endedAt,
          })
          .from(timeEntries)
          .innerJoin(users, eq(timeEntries.userId, users.id))
          .innerJoin(clients, eq(timeEntries.clientId, clients.id))
          .innerJoin(categories, eq(timeEntries.categoryId, categories.id))
          .where(
            and(
              isNull(timeEntries.deletedAt),
              gte(timeEntries.endedAt, todayRange.startIso),
              lt(timeEntries.endedAt, todayRange.endIso)
            )
          )
          .orderBy(desc(timeEntries.endedAt))
          .limit(100)
      : Promise.resolve([]),
  ]);

  return (
    <BluTimeDashboard
      user={user}
      departmentCount={departmentTotal?.value ?? 0}
      categoryCount={categoryTotal?.value ?? 0}
      departments={departmentRows}
      users={userRows}
      canManageUsers={allowUserManagement}
      canManagePlanner={allowPlanner}
      canUseAiBrain={allowAiBrain}
      canViewCompanyDashboard={allowCompanyDashboard}
      activeWork={activeWorkRows.map((timer) => ({
        id: timer.id,
        userName: timer.userName,
        clientName: timer.clientName,
        categoryName: timer.categoryName,
        taskTitle: timer.taskTitle,
        status: timer.status,
        elapsedSeconds: elapsedSeconds(timer),
      }))}
      todayLogs={todayLogRows}
    />
  );
}
