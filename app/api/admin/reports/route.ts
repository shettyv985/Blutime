import { and, asc, desc, eq, gte, isNull, lt } from "drizzle-orm";
import { NextResponse } from "next/server";

import { categories, clients, timeEntries, users } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { canViewCompanyDashboard } from "@/server/auth/permissions";
import { db } from "@/server/db/client";
import { todayRangeInIst } from "@/server/timers/day";

type GroupTotal = {
  id: string;
  name: string;
  totalSeconds: number;
  logCount: number;
};

const dayMs = 24 * 60 * 60 * 1000;

function rangeFromRequest(searchParams: URLSearchParams) {
  const mode = searchParams.get("range") ?? "today";
  const today = todayRangeInIst();

  if (mode === "week") {
    return { startIso: new Date(new Date(today.endIso).getTime() - 7 * dayMs).toISOString(), endIso: today.endIso };
  }

  if (mode === "month") {
    return { startIso: new Date(new Date(today.endIso).getTime() - 30 * dayMs).toISOString(), endIso: today.endIso };
  }

  if (mode === "custom") {
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    if (start && end) {
      return {
        startIso: new Date(`${start}T00:00:00+05:30`).toISOString(),
        endIso: new Date(new Date(`${end}T00:00:00+05:30`).getTime() + dayMs).toISOString(),
      };
    }
  }

  return today;
}

function addGroup(groups: Map<string, GroupTotal>, id: string, name: string, seconds: number) {
  const current = groups.get(id) ?? { id, name, totalSeconds: 0, logCount: 0 };
  current.totalSeconds += seconds;
  current.logCount += 1;
  groups.set(id, current);
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canViewCompanyDashboard(currentUser)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employeeId");
  const clientId = url.searchParams.get("clientId");
  const categoryId = url.searchParams.get("categoryId");
  const range = rangeFromRequest(url.searchParams);

  const conditions = [
    isNull(timeEntries.deletedAt),
    gte(timeEntries.endedAt, range.startIso),
    lt(timeEntries.endedAt, range.endIso),
  ];

  if (employeeId) conditions.push(eq(timeEntries.userId, employeeId));
  if (clientId) conditions.push(eq(timeEntries.clientId, clientId));
  if (categoryId) conditions.push(eq(timeEntries.categoryId, categoryId));

  const [reportRows, employeeOptions, clientOptions, categoryOptions] = await Promise.all([
    db
      .select({
        id: timeEntries.id,
        userId: users.id,
        userName: users.name,
        clientId: clients.id,
        clientName: clients.name,
        categoryId: categories.id,
        categoryName: categories.name,
        taskTitle: timeEntries.taskTitle,
        outputSummary: timeEntries.outputSummary,
        totalSeconds: timeEntries.totalSeconds,
        startedAt: timeEntries.startedAt,
        endedAt: timeEntries.endedAt,
      })
      .from(timeEntries)
      .innerJoin(users, eq(timeEntries.userId, users.id))
      .innerJoin(clients, eq(timeEntries.clientId, clients.id))
      .innerJoin(categories, eq(timeEntries.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(timeEntries.endedAt))
      .limit(500),
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(asc(users.name)),
    db.select({ id: clients.id, name: clients.name }).from(clients).orderBy(asc(clients.name)),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.displayOrder), asc(categories.name)),
  ]);

  const byEmployee = new Map<string, GroupTotal>();
  const byClient = new Map<string, GroupTotal>();
  const byCategory = new Map<string, GroupTotal>();
  let totalSeconds = 0;

  for (const row of reportRows) {
    totalSeconds += row.totalSeconds;
    addGroup(byEmployee, row.userId, row.userName, row.totalSeconds);
    addGroup(byClient, row.clientId, row.clientName, row.totalSeconds);
    addGroup(byCategory, row.categoryId, row.categoryName, row.totalSeconds);
  }

  const sortGroups = (items: Map<string, GroupTotal>) =>
    [...items.values()].sort((a, b) => b.totalSeconds - a.totalSeconds);

  return NextResponse.json({
    range,
    totals: {
      totalSeconds,
      logCount: reportRows.length,
      employeeCount: byEmployee.size,
      clientCount: byClient.size,
    },
    groups: {
      byEmployee: sortGroups(byEmployee),
      byClient: sortGroups(byClient),
      byCategory: sortGroups(byCategory),
    },
    logs: reportRows,
    options: {
      employees: employeeOptions,
      clients: clientOptions,
      categories: categoryOptions,
    },
  });
}
