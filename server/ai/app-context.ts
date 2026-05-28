import "server-only";

import { and, asc, desc, eq, gte, isNull } from "drizzle-orm";

import { categories, clients, departments, timeEntries, users } from "@/db/schema";
import { getBacklogTasksForPerson } from "@/server/basecamp/client";
import { db } from "@/server/db/client";

const dayMs = 24 * 60 * 60 * 1000;

function formatHours(seconds: number) {
  return `${(seconds / 3600).toFixed(2)}h`;
}

export async function buildBluTimeContext(question = "") {
  const since = new Date(Date.now() - 60 * dayMs).toISOString();

  const [userRows, clientRows, logRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        accessRole: users.accessRole,
        departmentName: departments.name,
        departmentSlug: departments.slug,
        basecampPersonId: users.basecampPersonId,
        isActive: users.isActive,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .orderBy(asc(users.name)),
    db
      .select({
        id: clients.id,
        name: clients.name,
        serviceType: clients.serviceType,
        isActive: clients.isActive,
      })
      .from(clients)
      .orderBy(asc(clients.name)),
    db
      .select({
        id: timeEntries.id,
        userId: users.id,
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
      .where(and(isNull(timeEntries.deletedAt), gte(timeEntries.endedAt, since)))
      .orderBy(desc(timeEntries.endedAt))
      .limit(1200),
  ]);

  const metrics = new Map<
    string,
    {
      name: string;
      logs: number;
      seconds: number;
      clients: Set<string>;
      categories: Set<string>;
      samples: string[];
    }
  >();

  for (const log of logRows) {
    const current =
      metrics.get(log.userId) ??
      {
        name: log.userName,
        logs: 0,
        seconds: 0,
        clients: new Set<string>(),
        categories: new Set<string>(),
        samples: [],
      };

    current.logs += 1;
    current.seconds += log.totalSeconds;
    current.clients.add(log.clientName);
    current.categories.add(log.categoryName);
    if (current.samples.length < 8) {
      current.samples.push(`${log.endedAt.slice(0, 10)} | ${log.clientName} | ${log.categoryName} | ${log.taskTitle} | ${log.outputSummary}`);
    }
    metrics.set(log.userId, current);
  }

  const employees = userRows
    .map(
      (user) =>
        `- ${user.name} <${user.email}> | role=${user.accessRole} | department=${user.departmentName ?? "unset"} | active=${user.isActive}`
    )
    .join("\n");

  const clientsText = clientRows
    .map((client) => `- ${client.name} | type=${client.serviceType} | active=${client.isActive}`)
    .join("\n");

  const metricsText = [...metrics.values()]
    .sort((a, b) => b.seconds - a.seconds)
    .map(
      (item) =>
        `- ${item.name}: ${item.logs} logs, ${formatHours(item.seconds)}, clients=${[...item.clients].join(", ") || "none"}, categories=${[...item.categories].join(", ") || "none"}\n  samples:\n  ${item.samples.join("\n  ")}`
    )
    .join("\n");

  const normalizedQuestion = question.toLowerCase();
  const mentionedUsers = userRows
    .filter((user) => {
      const name = user.name.toLowerCase();
      const emailName = user.email.split("@")[0]?.toLowerCase() ?? "";
      const firstName = name.split(/\s+/)[0] ?? "";
      return Boolean(
        user.basecampPersonId &&
          normalizedQuestion &&
          (normalizedQuestion.includes(name) ||
            (firstName.length >= 3 && normalizedQuestion.includes(firstName)) ||
            (emailName.length >= 3 && normalizedQuestion.includes(emailName)))
      );
    })
    .slice(0, 5);

  const basecampTaskSections = await Promise.all(
    mentionedUsers.map(async (user) => {
      try {
        const tasks = await getBacklogTasksForPerson(user.basecampPersonId as string);
        const overdue = tasks.filter((task) => task.dueStatus === "overdue").length;
        const today = tasks.filter((task) => task.dueStatus === "today").length;
        const upcoming = tasks.filter((task) => task.dueStatus === "upcoming").length;
        const taskLines = tasks
          .slice(0, 30)
          .map(
            (task) =>
              `  - ${task.dueOn} | ${task.dueStatus} | ${task.projectName} | ${task.title}${task.appUrl ? ` | ${task.appUrl}` : ""}`
          )
          .join("\n");

        return `- ${user.name}: ${tasks.length} pending Basecamp tasks (${overdue} overdue, ${today} today, ${upcoming} upcoming)\n${taskLines || "  (none)"}`;
      } catch (error) {
        return `- ${user.name}: Could not fetch Basecamp pending tasks (${error instanceof Error ? error.message : "unknown error"})`;
      }
    })
  );

  return `BLUTIME APP CONTEXT
Generated at: ${new Date().toISOString()}
Window: last 60 days of saved work logs, excluding deleted logs.

USERS
${employees || "(none)"}

CLIENTS
${clientsText || "(none)"}

WORK METRICS BY PERSON
${metricsText || "(no logs in window)"}

BASECAMP PENDING TASKS FOR PEOPLE MENTIONED IN QUESTION
${basecampTaskSections.length > 0 ? basecampTaskSections.join("\n\n") : "(No mapped person name detected in the question.)"}`;
}
