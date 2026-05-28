import { and, asc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  clientTeamMembers,
  clients,
  categories,
  departments,
  monthlyPlanDeliverables,
  monthlyPlans,
  plannerAssignments,
  timeEntries,
  type NewPlannerAssignment,
  type PlannerAssignmentStatus,
  type PlannerDeliverableType,
  users,
} from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { canManagePlanner } from "@/server/auth/permissions";
import { getBacklogTasksForPerson } from "@/server/basecamp/client";
import { db } from "@/server/db/client";
import { createId } from "@/server/ids";

type Role = "writer" | "designer" | "editor" | "production";

type PlannerUser = {
  id: string;
  name: string;
  departmentName: string | null;
  basecampPersonId: string | null;
};

type DayLoad = {
  date: string;
  week: number;
  capacity: Record<Role, number>;
  used: Record<Role, number>;
};

type CalendarDay = {
  date: string;
  day: number;
  dayName: string;
  week: number;
  status: "working" | "half_day" | "off";
  reason: string;
  capacityMultiplier: number;
  capacity: Record<Role, number>;
};

type Need = {
  role: Role;
  effort: number;
};

type StageChoice = {
  date: string | null;
  userId: string | null;
  userName: string | null;
  ratio: number;
  notes: string[];
};

type ClientWeekCapacity = {
  writerCapacity: number;
  designerCapacity: number;
  editorCapacity: number;
  productionCapacity: number;
  podOutputCapacity: number;
};

const roleCapacities: Record<Role, number> = {
  writer: 5,
  designer: 5,
  editor: 3,
  production: 4,
};

const stageNeedsByType: Record<PlannerDeliverableType, Need[]> = {
  static: [
    { role: "writer", effort: 1 },
    { role: "designer", effort: 1 },
  ],
  carousel: [
    { role: "writer", effort: 1 },
    { role: "designer", effort: 1.7 },
  ],
  reel_edit: [
    { role: "writer", effort: 1 },
    { role: "production", effort: 1 },
    { role: "editor", effort: 1.5 },
  ],
  ai_video: [
    { role: "writer", effort: 1 },
    { role: "editor", effort: 3 },
  ],
};

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(monthKey: string | null) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return null;

  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return null;

  return { year, month, monthKey: `${year}-${String(month).padStart(2, "0")}` };
}

function nextMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function capacityForMultiplier(multiplier: number) {
  return {
    writer: roleCapacities.writer * multiplier,
    designer: roleCapacities.designer * multiplier,
    editor: roleCapacities.editor * multiplier,
    production: roleCapacities.production * multiplier,
  };
}

function calendarForMonth(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const days: CalendarDay[] = [];
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let saturdayCount = 0;

  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = date.getUTCDay();
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;

    if (isSaturday) saturdayCount += 1;

    const isEvenSaturday = isSaturday && saturdayCount % 2 === 0;
    const isOddSaturday = isSaturday && saturdayCount % 2 === 1;
    const capacityMultiplier = isSunday || isEvenSaturday ? 0 : isOddSaturday ? 0.5 : 1;
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    days.push({
      date: dateKey,
      day,
      dayName: date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      week: Math.ceil(day / 7),
      status: capacityMultiplier === 0 ? "off" : capacityMultiplier < 1 ? "half_day" : "working",
      reason: isSunday ? "Sunday off" : isEvenSaturday ? "Even Saturday off" : isOddSaturday ? "Odd Saturday half-day" : "Working day",
      capacityMultiplier,
      capacity: capacityForMultiplier(capacityMultiplier),
    });
  }

  return days;
}

function monthDays(monthKey: string) {
  return calendarForMonth(monthKey)
    .filter((day) => day.capacityMultiplier > 0)
    .map<DayLoad>((day) => ({
      date: day.date,
      week: day.week,
      capacity: day.capacity,
      used: { writer: 0, designer: 0, editor: 0, production: 0 },
    }));
}

function preferredWeeks(serviceLine: string) {
  if (serviceLine === "performance") return [1, 2, 3, 4, 5];
  return [1, 2, 3, 4, 5];
}

function baseDeliveryWeeks(weekNumbers: number[], serviceLine: string) {
  const earlyWeeks = weekNumbers.filter((week) => week <= 3);
  const fallbackWeeks = weekNumbers.filter((week) => week > 3);
  const orderedEarlyWeeks = preferredWeeks(serviceLine).filter((week) => earlyWeeks.includes(week));

  return [
    ...orderedEarlyWeeks,
    ...earlyWeeks.filter((week) => !orderedEarlyWeeks.includes(week)),
    ...fallbackWeeks,
  ];
}

function primaryDeliveryWeeks(weekNumbers: number[], serviceLine: string) {
  const earlyWeeks = baseDeliveryWeeks(weekNumbers, serviceLine).filter((week) => week <= 3);
  return earlyWeeks.length > 0 ? earlyWeeks : baseDeliveryWeeks(weekNumbers, serviceLine);
}

function statusFromRatio(ratio: number) {
  if (ratio > 1) return "Overloaded";
  if (ratio > 0.85) return "Tight";
  return "Good";
}

function roleForDepartment(departmentName: string | null): Role | null {
  if (departmentName === "Content Writer") return "writer";
  if (departmentName === "Designer") return "designer";
  if (departmentName === "Editor") return "editor";
  if (departmentName === "Production") return "production";
  return null;
}

function nextWorkingDate(days: DayLoad[], date: string | null) {
  if (!date) return null;
  return days.find((day) => day.date > date)?.date ?? date;
}

function stageDateSummary(stages: Record<Role, StageChoice>) {
  const dates = [stages.writer.date, stages.designer.date, stages.production.date, stages.editor.date].filter(
    (date): date is string => Boolean(date)
  );
  return dates.sort().at(-1) ?? null;
}

function stageWeek(days: DayLoad[], date: string | null) {
  if (!date) return 1;
  return days.find((day) => day.date === date)?.week ?? 1;
}

function candidateRatio(
  role: Role,
  effort: number,
  day: DayLoad,
  person: PlannerUser,
  personDayLoad: Map<string, number>
) {
  const capacity = Math.max(day.capacity[role], 0.01);

  if (role === "production") {
    return (day.used.production + effort) / capacity;
  }

  return ((personDayLoad.get(personDayKey(person.id, role, day.date)) ?? 0) + effort) / capacity;
}

function chooseCandidate(
  candidates: PlannerUser[],
  role: Role,
  effort: number,
  day: DayLoad,
  personLoad: Map<string, number>,
  personDayLoad: Map<string, number>,
  backlogPressure: Map<string, number>
) {
  if (candidates.length === 0) return null;

  return [...candidates].sort((left, right) => {
    const leftDailyRatio = candidateRatio(role, effort, day, left, personDayLoad);
    const rightDailyRatio = candidateRatio(role, effort, day, right, personDayLoad);
    const leftScore =
      Math.max(0, leftDailyRatio - 1) * 100 +
      leftDailyRatio +
      (personLoad.get(left.id) ?? 0) * 0.08 +
      (backlogPressure.get(left.id) ?? 0) * 0.06;
    const rightScore =
      Math.max(0, rightDailyRatio - 1) * 100 +
      rightDailyRatio +
      (personLoad.get(right.id) ?? 0) * 0.08 +
      (backlogPressure.get(right.id) ?? 0) * 0.06;
    return leftScore - rightScore;
  })[0];
}

function personDayKey(userId: string, role: Role, date: string) {
  return `${userId}:${role}:${date}`;
}

function commitStageChoice({
  day,
  effort,
  person,
  personDayLoad,
  personLoad,
  role,
}: {
  day: DayLoad;
  effort: number;
  person: PlannerUser;
  personDayLoad: Map<string, number>;
  personLoad: Map<string, number>;
  role: Role;
}) {
  const key = personDayKey(person.id, role, day.date);
  const nextPersonDayLoad = (personDayLoad.get(key) ?? 0) + effort;

  day.used[role] += effort;
  personDayLoad.set(key, nextPersonDayLoad);
  personLoad.set(person.id, (personLoad.get(person.id) ?? 0) + effort);

  return {
    date: day.date,
    userId: person.id,
    userName: person.name,
    ratio: role === "production" ? day.used.production / day.capacity.production : nextPersonDayLoad / day.capacity[role],
    notes: [],
  };
}

function chooseStage({
  candidates,
  days,
  effort,
  earliestDate,
  preferredWeekOrder,
  role,
  personLoad,
  personDayLoad,
  backlogPressure,
}: {
  candidates: PlannerUser[];
  days: DayLoad[];
  effort: number;
  earliestDate: string | null;
  preferredWeekOrder: number[];
  role: Role;
  personLoad: Map<string, number>;
  personDayLoad: Map<string, number>;
  backlogPressure: Map<string, number>;
}): StageChoice {
  const notes: string[] = [];
  const dateFloor = earliestDate ?? days[0]?.date ?? null;
  const usableDays = days.filter((day) => !dateFloor || day.date >= dateFloor);

  if (usableDays.length === 0) {
    return { date: null, userId: null, userName: null, ratio: Number.POSITIVE_INFINITY, notes: ["No working day available"] };
  }

  if (candidates.length === 0) {
    return { date: usableDays[0].date, userId: null, userName: null, ratio: Number.POSITIVE_INFINITY, notes: [`No mapped ${role}`] };
  }

  let best:
    | {
        day: DayLoad;
        person: PlannerUser;
        score: number;
        ratio: number;
      }
    | null = null;

  const orderedDays = preferredWeekOrder.flatMap((week) => usableDays.filter((day) => day.week === week));
  const fallbackDays = usableDays.filter((day) => !orderedDays.some((orderedDay) => orderedDay.date === day.date));

  for (const day of [...orderedDays, ...fallbackDays]) {
    const person = chooseCandidate(candidates, role, effort, day, personLoad, personDayLoad, backlogPressure);
    if (!person) continue;

    const ratio = candidateRatio(role, effort, day, person, personDayLoad);

    if (ratio <= 1) {
      return commitStageChoice({ day, effort, person, personDayLoad, personLoad, role });
    }

    const score = ratio + (personLoad.get(person.id) ?? 0) * 0.08 + (backlogPressure.get(person.id) ?? 0) * 0.06;

    if (!best || score < best.score) {
      best = { day, person, score, ratio };
    }
  }

  if (!best) {
    return { date: usableDays[0].date, userId: null, userName: null, ratio: Number.POSITIVE_INFINITY, notes };
  }

  return commitStageChoice({ day: best.day, effort, person: best.person, personDayLoad, personLoad, role });
}

function emptyStages(): Record<Role, StageChoice> {
  return {
    writer: { date: null, userId: null, userName: null, ratio: 0, notes: [] },
    designer: { date: null, userId: null, userName: null, ratio: 0, notes: [] },
    production: { date: null, userId: null, userName: null, ratio: 0, notes: [] },
    editor: { date: null, userId: null, userName: null, ratio: 0, notes: [] },
  };
}

function completedRoleForType(deliverableType: PlannerDeliverableType): Role {
  if (deliverableType === "static" || deliverableType === "carousel") return "designer";
  return "editor";
}

function normalizedSearchText(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function matchesDeliverableType(deliverableType: PlannerDeliverableType, text: string) {
  if (deliverableType === "carousel") return /\b(carousel|carousal)\b/.test(text);
  if (deliverableType === "reel_edit") return /\b(reel|video|edit)\b/.test(text);
  if (deliverableType === "ai_video") return /\b(ai|ai video|ai reel)\b/.test(text);
  return /\b(static|poster|single|creative|post)\b/.test(text);
}

function matchesServiceLine(serviceLine: string, text: string) {
  const mentionsPerformance = /\b(performance|perf)\b/.test(text);
  const mentionsSocial = /\b(social|sm)\b/.test(text);

  if (serviceLine === "performance") return mentionsPerformance || !mentionsSocial;
  if (serviceLine === "social") return mentionsSocial || !mentionsPerformance;
  return true;
}

function buildConditions(monthKey: string, leadUserId?: string | null) {
  const conditions = [eq(monthlyPlans.monthKey, monthKey), eq(clients.isActive, true)];
  if (leadUserId) conditions.push(eq(clients.leadUserId, leadUserId));
  return and(...conditions);
}

function clientCapacityKey(clientId: string, week: number) {
  return `${clientId}:${week}`;
}

function summarizeWeeks({
  calendarDays,
  clientWeekCapacity,
  dayLoads,
  suggestions,
}: {
  calendarDays: CalendarDay[];
  clientWeekCapacity: Map<string, ClientWeekCapacity>;
  dayLoads: DayLoad[];
  suggestions: Array<{
    clientId: string;
    week: number;
    clientName: string;
    title: string;
    serviceLine: string;
    deliverableType: PlannerDeliverableType;
    completedAt: string | null;
    writer: string | null;
    writerDate: string | null;
    designer: string | null;
    designerDate: string | null;
    production: string | null;
    productionDate: string | null;
    editor: string | null;
    editorDate: string | null;
  }>;
}) {
  const weeks = new Map<number, {
    week: number;
    startDate: string;
    endDate: string;
    planned: number;
    completed: number;
    social: number;
    performance: number;
    static: number;
    carousel: number;
    reelEdit: number;
    aiVideo: number;
    writerTasks: number;
    designerTasks: number;
    editorTasks: number;
    productionShoots: number;
    writerLoad: number;
    writerCapacity: number;
    designerLoad: number;
    designerCapacity: number;
    editorLoad: number;
    editorCapacity: number;
    productionLoad: number;
    productionCapacity: number;
    clients: Record<string, {
      clientName: string;
      planned: number;
      completed: number;
      social: number;
      performance: number;
      static: number;
      carousel: number;
      reelEdit: number;
      aiVideo: number;
      writerTasks: number;
      designerTasks: number;
      editorTasks: number;
      productionShoots: number;
      writerCapacity: number;
      designerCapacity: number;
      editorCapacity: number;
      productionCapacity: number;
      podOutputCapacity: number;
      items: Array<{
        title: string;
        serviceLine: string;
        deliverableType: PlannerDeliverableType;
        writer: string | null;
        writerDate: string | null;
        designer: string | null;
        designerDate: string | null;
        production: string | null;
        productionDate: string | null;
        editor: string | null;
        editorDate: string | null;
      }>;
    }>;
  }>();

  const workingDays = calendarDays.filter((day) => day.capacityMultiplier > 0);

  for (const day of workingDays) {
    const current = weeks.get(day.week);
    weeks.set(day.week, {
      week: day.week,
      startDate: current?.startDate ?? day.date,
      endDate: day.date,
      planned: current?.planned ?? 0,
      completed: current?.completed ?? 0,
      social: current?.social ?? 0,
      performance: current?.performance ?? 0,
      static: current?.static ?? 0,
      carousel: current?.carousel ?? 0,
      reelEdit: current?.reelEdit ?? 0,
      aiVideo: current?.aiVideo ?? 0,
      writerTasks: current?.writerTasks ?? 0,
      designerTasks: current?.designerTasks ?? 0,
      editorTasks: current?.editorTasks ?? 0,
      productionShoots: current?.productionShoots ?? 0,
      writerLoad: current?.writerLoad ?? 0,
      writerCapacity: current?.writerCapacity ?? 0,
      designerLoad: current?.designerLoad ?? 0,
      designerCapacity: current?.designerCapacity ?? 0,
      editorLoad: current?.editorLoad ?? 0,
      editorCapacity: current?.editorCapacity ?? 0,
      productionLoad: current?.productionLoad ?? 0,
      productionCapacity: current?.productionCapacity ?? 0,
      clients: current?.clients ?? {},
    });
  }

  for (const day of dayLoads) {
    const summary = weeks.get(day.week);
    if (!summary) continue;

    summary.writerLoad += day.used.writer;
    summary.writerCapacity += day.capacity.writer;
    summary.designerLoad += day.used.designer;
    summary.designerCapacity += day.capacity.designer;
    summary.editorLoad += day.used.editor;
    summary.editorCapacity += day.capacity.editor;
    summary.productionLoad += day.used.production;
    summary.productionCapacity += day.capacity.production;
  }

  for (const item of suggestions) {
    const summary = weeks.get(item.week);
    if (!summary) continue;
    const capacity = clientWeekCapacity.get(clientCapacityKey(item.clientId, item.week)) ?? {
      writerCapacity: 0,
      designerCapacity: 0,
      editorCapacity: 0,
      productionCapacity: 0,
      podOutputCapacity: 0,
    };
    const clientSummary = (summary.clients[item.clientName] ??= {
      clientName: item.clientName,
      planned: 0,
      completed: 0,
      social: 0,
      performance: 0,
      static: 0,
      carousel: 0,
      reelEdit: 0,
      aiVideo: 0,
      writerTasks: 0,
      designerTasks: 0,
      editorTasks: 0,
      productionShoots: 0,
      writerCapacity: capacity.writerCapacity,
      designerCapacity: capacity.designerCapacity,
      editorCapacity: capacity.editorCapacity,
      productionCapacity: capacity.productionCapacity,
      podOutputCapacity: capacity.podOutputCapacity,
      items: [],
    });

    summary.planned += 1;
    clientSummary.planned += 1;
    clientSummary.items.push({
      title: item.title,
      serviceLine: item.serviceLine,
      deliverableType: item.deliverableType,
      writer: item.writer,
      writerDate: item.writerDate,
      designer: item.designer,
      designerDate: item.designerDate,
      production: item.production,
      productionDate: item.productionDate,
      editor: item.editor,
      editorDate: item.editorDate,
    });
    if (item.completedAt) {
      summary.completed += 1;
      clientSummary.completed += 1;
    }
    if (item.serviceLine === "performance") {
      summary.performance += 1;
      clientSummary.performance += 1;
    }
    if (item.serviceLine === "social") {
      summary.social += 1;
      clientSummary.social += 1;
    }
    if (item.deliverableType === "static") {
      summary.static += 1;
      clientSummary.static += 1;
    }
    if (item.deliverableType === "carousel") {
      summary.carousel += 1;
      clientSummary.carousel += 1;
    }
    if (item.deliverableType === "reel_edit") {
      summary.reelEdit += 1;
      clientSummary.reelEdit += 1;
    }
    if (item.deliverableType === "ai_video") {
      summary.aiVideo += 1;
      clientSummary.aiVideo += 1;
    }

    const stageWeeks = [
      item.writerDate ? { role: "writer" as const, week: workingDays.find((day) => day.date === item.writerDate)?.week } : null,
      item.designerDate ? { role: "designer" as const, week: workingDays.find((day) => day.date === item.designerDate)?.week } : null,
      item.editorDate ? { role: "editor" as const, week: workingDays.find((day) => day.date === item.editorDate)?.week } : null,
      item.productionDate ? { role: "production" as const, week: workingDays.find((day) => day.date === item.productionDate)?.week } : null,
    ].filter((stage): stage is { role: Role; week: number } => Boolean(stage?.week));

    for (const stage of stageWeeks) {
      const stageSummary = weeks.get(stage.week);
      if (!stageSummary) continue;
      const stageCapacity = clientWeekCapacity.get(clientCapacityKey(item.clientId, stage.week)) ?? {
        writerCapacity: 0,
        designerCapacity: 0,
        editorCapacity: 0,
        productionCapacity: 0,
        podOutputCapacity: 0,
      };
      const stageClientSummary = (stageSummary.clients[item.clientName] ??= {
        clientName: item.clientName,
        planned: 0,
        completed: 0,
        social: 0,
        performance: 0,
        static: 0,
        carousel: 0,
        reelEdit: 0,
        aiVideo: 0,
        writerTasks: 0,
        designerTasks: 0,
        editorTasks: 0,
        productionShoots: 0,
        writerCapacity: stageCapacity.writerCapacity,
        designerCapacity: stageCapacity.designerCapacity,
        editorCapacity: stageCapacity.editorCapacity,
        productionCapacity: stageCapacity.productionCapacity,
        podOutputCapacity: stageCapacity.podOutputCapacity,
        items: [],
      });

      if (stage.role === "writer") {
        stageSummary.writerTasks += 1;
        stageClientSummary.writerTasks += 1;
      }
      if (stage.role === "designer") {
        stageSummary.designerTasks += 1;
        stageClientSummary.designerTasks += 1;
      }
      if (stage.role === "editor") {
        stageSummary.editorTasks += 1;
        stageClientSummary.editorTasks += 1;
      }
      if (stage.role === "production") {
        stageSummary.productionShoots += 1;
        stageClientSummary.productionShoots += 1;
      }
    }
  }

  return [...weeks.values()]
    .map((week) => ({
      ...week,
      clients: Object.values(week.clients).sort((left, right) => right.planned - left.planned || left.clientName.localeCompare(right.clientName)),
    }))
    .sort((left, right) => left.week - right.week);
}

async function buildPlannerSuggestions(
  monthKey: string,
  leadUserId?: string | null,
  options: { preserveSavedAssignments?: boolean } = {}
) {
  const preserveSavedAssignments = options.preserveSavedAssignments ?? false;
  const [deliverables, teamRows, people] = await Promise.all([
    db
      .select({
        id: monthlyPlanDeliverables.id,
        title: monthlyPlanDeliverables.title,
        deliverableType: monthlyPlanDeliverables.deliverableType,
        serviceLine: monthlyPlanDeliverables.serviceLine,
        sequence: monthlyPlanDeliverables.sequence,
        clientId: monthlyPlans.clientId,
        clientName: clients.name,
      })
      .from(monthlyPlanDeliverables)
      .innerJoin(monthlyPlans, eq(monthlyPlanDeliverables.monthlyPlanId, monthlyPlans.id))
      .innerJoin(clients, eq(monthlyPlans.clientId, clients.id))
      .where(buildConditions(monthKey, leadUserId))
      .orderBy(asc(monthlyPlanDeliverables.serviceLine), asc(clients.name), asc(monthlyPlanDeliverables.sequence)),
    db
      .select({
        clientId: clientTeamMembers.clientId,
        userId: clientTeamMembers.userId,
        teamRole: clientTeamMembers.teamRole,
      })
      .from(clientTeamMembers),
    db
      .select({
        id: users.id,
        name: users.name,
        basecampPersonId: users.basecampPersonId,
        departmentName: departments.name,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(eq(users.isActive, true))
      .orderBy(asc(users.name)),
  ]);

  const existingAssignments =
    deliverables.length > 0
      ? await db
          .select({
            deliverableId: plannerAssignments.deliverableId,
            status: plannerAssignments.status,
            plannedWeek: plannerAssignments.plannedWeek,
            writerUserId: plannerAssignments.writerUserId,
            writerDate: plannerAssignments.writerDate,
            designerUserId: plannerAssignments.designerUserId,
            designerDate: plannerAssignments.designerDate,
            productionUserId: plannerAssignments.productionUserId,
            productionDate: plannerAssignments.productionDate,
            editorUserId: plannerAssignments.editorUserId,
            editorDate: plannerAssignments.editorDate,
            completedAt: plannerAssignments.completedAt,
            writerCompletedAt: plannerAssignments.writerCompletedAt,
            designerCompletedAt: plannerAssignments.designerCompletedAt,
            productionCompletedAt: plannerAssignments.productionCompletedAt,
            editorCompletedAt: plannerAssignments.editorCompletedAt,
            basecampTaskId: plannerAssignments.basecampTaskId,
            basecampTaskUrl: plannerAssignments.basecampTaskUrl,
            basecampTaskTitle: plannerAssignments.basecampTaskTitle,
          })
          .from(plannerAssignments)
          .where(inArray(plannerAssignments.deliverableId, deliverables.map((deliverable) => deliverable.id)))
      : [];
  const existingByDeliverableId = new Map(existingAssignments.map((assignment) => [assignment.deliverableId, assignment]));

  const plannerPeople = people.filter((person) => roleForDepartment(person.departmentName));
  const backlogResults = await Promise.allSettled(
    plannerPeople
      .filter((person) => person.basecampPersonId)
      .map(async (person) => ({ person, tasks: await getBacklogTasksForPerson(person.basecampPersonId as string) }))
  );
  const backlogPressure = new Map<string, number>();
  const backlogSummary = [];

  for (const result of backlogResults) {
    if (result.status !== "fulfilled") continue;
    const overdue = result.value.tasks.filter((task) => task.dueStatus === "overdue").length;
    const today = result.value.tasks.filter((task) => task.dueStatus === "today").length;
    const upcoming = result.value.tasks.filter((task) => task.dueStatus === "upcoming").length;
    const pressure = overdue * 1.5 + today + upcoming * 0.35;
    backlogPressure.set(result.value.person.id, pressure);
    backlogSummary.push({
      userId: result.value.person.id,
      name: result.value.person.name,
      overdue,
      today,
      upcoming,
      pressure,
    });
  }

  const peopleById = new Map(people.map((person) => [person.id, person]));
  const productionPeople = people.filter((person) => person.departmentName === "Production");
  const calendarDays = calendarForMonth(monthKey);
  const days = monthDays(monthKey);
  const weekNumbers = [...new Set(days.map((day) => day.week))].sort((left, right) => left - right);
  const weeklyCapacity = new Map<number, Record<Role, number>>();

  for (const day of days) {
    const current = weeklyCapacity.get(day.week) ?? { writer: 0, designer: 0, editor: 0, production: 0 };
    current.writer += day.capacity.writer;
    current.designer += day.capacity.designer;
    current.editor += day.capacity.editor;
    current.production += day.capacity.production;
    weeklyCapacity.set(day.week, current);
  }

  const clientIds = [...new Set(deliverables.map((deliverable) => deliverable.clientId))];
  const clientWeekCapacity = new Map<string, ClientWeekCapacity>();

  for (const clientId of clientIds) {
    const teamForClient = teamRows.filter((member) => member.clientId === clientId);
    const writerCount = new Set(teamForClient.filter((member) => member.teamRole === "writer").map((member) => member.userId)).size;
    const designerCount = new Set(teamForClient.filter((member) => member.teamRole === "designer").map((member) => member.userId)).size;
    const editorCount = new Set(teamForClient.filter((member) => member.teamRole === "editor").map((member) => member.userId)).size;

    for (const [week, capacity] of weeklyCapacity) {
      const writerCapacity = writerCount * capacity.writer;
      const designerCapacity = designerCount * capacity.designer;
      const editorCapacity = editorCount * capacity.editor;
      const productionCapacity = capacity.production;
      const podOutputCapacity = Math.floor(Math.min(writerCapacity, designerCapacity + editorCapacity));

      clientWeekCapacity.set(clientCapacityKey(clientId, week), {
        writerCapacity,
        designerCapacity,
        editorCapacity,
        productionCapacity,
        podOutputCapacity,
      });
    }
  }

  const targetWeekByDeliverableId = new Map<string, number>();
  const deliverablesByClient = new Map<string, typeof deliverables>();

  for (const deliverable of deliverables) {
    const clientDeliverables = deliverablesByClient.get(deliverable.clientId) ?? [];
    clientDeliverables.push(deliverable);
    deliverablesByClient.set(deliverable.clientId, clientDeliverables);
  }

  for (const clientDeliverables of deliverablesByClient.values()) {
    const sortedClientDeliverables = [...clientDeliverables].sort((left, right) => {
      if (left.serviceLine !== right.serviceLine) return left.serviceLine === "performance" ? -1 : 1;
      return left.sequence - right.sequence;
    });

    sortedClientDeliverables.forEach((deliverable, index) => {
      const deliveryWeeks = primaryDeliveryWeeks(weekNumbers, deliverable.serviceLine);
      const targetWeek = deliveryWeeks[index % Math.max(deliveryWeeks.length, 1)];
      if (targetWeek) targetWeekByDeliverableId.set(deliverable.id, targetWeek);
    });
  }

  const personLoad = new Map<string, number>();
  const personDayLoad = new Map<string, number>();
  const suggestions = [];

  for (const deliverable of deliverables) {
    const targetWeek = targetWeekByDeliverableId.get(deliverable.id);
    const weeks = targetWeek
      ? [targetWeek, ...baseDeliveryWeeks(weekNumbers, deliverable.serviceLine).filter((week) => week !== targetWeek)]
      : preferredWeeks(deliverable.serviceLine);
    const needs = stageNeedsByType[deliverable.deliverableType];
    const teamForClient = teamRows.filter((member) => member.clientId === deliverable.clientId);
    const stages = emptyStages();
    const notes: string[] = [];
    let earliestDate: string | null = null;
    let maxRatio = 0;

    for (const need of needs) {
      const candidates =
        need.role === "production"
          ? productionPeople
          : teamForClient
              .filter((member) => member.teamRole === need.role)
              .map((member) => peopleById.get(member.userId))
              .filter((person): person is PlannerUser => Boolean(person));
      const stage = chooseStage({
        candidates,
        days,
        effort: need.effort,
        earliestDate: earliestDate ?? days[0]?.date ?? null,
        preferredWeekOrder: weeks,
        role: need.role,
        personLoad,
        personDayLoad,
        backlogPressure,
      });

      stages[need.role] = stage;
      notes.push(...stage.notes);
      maxRatio = Math.max(maxRatio, stage.ratio);
      earliestDate = nextWorkingDate(days, stage.date);
    }

    const existing = existingByDeliverableId.get(deliverable.id);
    const writerUserId = preserveSavedAssignments ? (existing?.writerUserId ?? stages.writer.userId) : stages.writer.userId;
    const designerUserId = preserveSavedAssignments ? (existing?.designerUserId ?? stages.designer.userId) : stages.designer.userId;
    const productionUserId = preserveSavedAssignments ? (existing?.productionUserId ?? stages.production.userId) : stages.production.userId;
    const editorUserId = preserveSavedAssignments ? (existing?.editorUserId ?? stages.editor.userId) : stages.editor.userId;
    const writerDate = preserveSavedAssignments ? (existing?.writerDate ?? stages.writer.date) : stages.writer.date;
    const designerDate = preserveSavedAssignments ? (existing?.designerDate ?? stages.designer.date) : stages.designer.date;
    const productionDate = preserveSavedAssignments ? (existing?.productionDate ?? stages.production.date) : stages.production.date;
    const editorDate = preserveSavedAssignments ? (existing?.editorDate ?? stages.editor.date) : stages.editor.date;
    const finalDate =
      [writerDate, designerDate, productionDate, editorDate].filter((date): date is string => Boolean(date)).sort().at(-1) ??
      stageDateSummary(stages);
    const finalWeek = preserveSavedAssignments ? (existing?.plannedWeek ?? stageWeek(days, finalDate)) : stageWeek(days, finalDate);
    const completionRole = completedRoleForType(deliverable.deliverableType);

    suggestions.push({
      id: deliverable.id,
      clientId: deliverable.clientId,
      date: finalDate ?? days[0]?.date ?? monthKey,
      week: finalWeek,
      clientName: deliverable.clientName,
      title: deliverable.title,
      serviceLine: deliverable.serviceLine,
      deliverableType: deliverable.deliverableType,
      writer: writerUserId ? (peopleById.get(writerUserId)?.name ?? stages.writer.userName) : stages.writer.userName,
      writerUserId,
      writerDate,
      writerCompletedAt: existing?.writerCompletedAt ?? null,
      designer: designerUserId ? (peopleById.get(designerUserId)?.name ?? stages.designer.userName) : stages.designer.userName,
      designerUserId,
      designerDate,
      designerCompletedAt: existing?.designerCompletedAt ?? null,
      editor: editorUserId ? (peopleById.get(editorUserId)?.name ?? stages.editor.userName) : stages.editor.userName,
      editorUserId,
      editorDate,
      editorCompletedAt: existing?.editorCompletedAt ?? null,
      production: productionUserId ? (peopleById.get(productionUserId)?.name ?? stages.production.userName) : stages.production.userName,
      productionUserId,
      productionDate,
      productionCompletedAt: existing?.productionCompletedAt ?? null,
      completionOwner: completionRole,
      basecampTaskId: existing?.basecampTaskId ?? null,
      basecampTaskUrl: existing?.basecampTaskUrl ?? null,
      basecampTaskTitle: existing?.basecampTaskTitle ?? null,
      completedAt: existing?.completedAt ?? null,
      savedStatus: existing?.status ?? null,
      status: statusFromRatio(maxRatio),
      notes,
    });
  }

  return {
    monthKey,
    suggestions,
    backlogSummary: backlogSummary.sort((left, right) => right.pressure - left.pressure),
    dayLoads: days.map((day) => ({
      date: day.date,
      week: day.week,
      used: day.used,
      capacity: day.capacity,
    })),
    weeklySummary: summarizeWeeks({ calendarDays, clientWeekCapacity, dayLoads: days, suggestions }),
    calendarDays,
  };
}

function monthKeyFromRequest(request: Request) {
  const url = new URL(request.url);
  const parsedMonth = parseMonthKey(url.searchParams.get("monthKey")) ?? parseMonthKey(currentMonthKey());
  return parsedMonth?.monthKey ?? currentMonthKey();
}

function leadUserIdFromRequest(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("leadUserId")?.trim() || null;
}

function preserveSavedAssignmentsFromRequest(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get("restore") === "1";
}

async function refreshCompletionsFromLogs(monthKey: string, leadUserId?: string | null) {
  const startIso = `${monthKey}-01T00:00:00.000Z`;
  const endIso = `${nextMonthKey(monthKey)}-01T00:00:00.000Z`;
  const assignmentsToTrack = await db
    .select({
      assignmentId: plannerAssignments.id,
      clientId: monthlyPlans.clientId,
      deliverableType: monthlyPlanDeliverables.deliverableType,
      serviceLine: monthlyPlanDeliverables.serviceLine,
      designerUserId: plannerAssignments.designerUserId,
      editorUserId: plannerAssignments.editorUserId,
    })
    .from(plannerAssignments)
    .innerJoin(monthlyPlanDeliverables, eq(plannerAssignments.deliverableId, monthlyPlanDeliverables.id))
    .innerJoin(monthlyPlans, eq(monthlyPlanDeliverables.monthlyPlanId, monthlyPlans.id))
    .innerJoin(clients, eq(monthlyPlans.clientId, clients.id))
    .where(and(buildConditions(monthKey, leadUserId), isNull(plannerAssignments.completedAt)));

  if (assignmentsToTrack.length === 0) return 0;

  const logRows = await db
    .select({
      id: timeEntries.id,
      userId: timeEntries.userId,
      clientId: timeEntries.clientId,
      taskTitle: timeEntries.taskTitle,
      outputSummary: timeEntries.outputSummary,
      basecampTaskId: timeEntries.basecampTaskId,
      basecampTaskUrl: timeEntries.basecampTaskUrl,
      endedAt: timeEntries.endedAt,
      categoryName: categories.name,
    })
    .from(timeEntries)
    .innerJoin(categories, eq(timeEntries.categoryId, categories.id))
    .where(and(isNull(timeEntries.deletedAt), gte(timeEntries.endedAt, startIso), lt(timeEntries.endedAt, endIso)))
    .orderBy(asc(timeEntries.endedAt));

  const usedLogIds = new Set<string>();
  let refreshed = 0;

  for (const assignment of assignmentsToTrack) {
    const completionRole = completedRoleForType(assignment.deliverableType);
    const ownerUserId = completionRole === "designer" ? assignment.designerUserId : assignment.editorUserId;
    if (!ownerUserId) continue;

    const matchedLog = logRows.find((log) => {
      if (usedLogIds.has(log.id)) return false;
      if (log.clientId !== assignment.clientId || log.userId !== ownerUserId) return false;

      const text = normalizedSearchText(log.taskTitle, log.outputSummary, log.categoryName);
      return matchesDeliverableType(assignment.deliverableType, text) && matchesServiceLine(assignment.serviceLine, text);
    });

    if (!matchedLog) continue;

    usedLogIds.add(matchedLog.id);
    refreshed += 1;

    await db
      .update(plannerAssignments)
      .set({
        status: "completed",
        completedAt: matchedLog.endedAt,
        completedByUserId: matchedLog.userId,
        completedFromTimeEntryId: matchedLog.id,
        basecampTaskId: matchedLog.basecampTaskId,
        basecampTaskUrl: matchedLog.basecampTaskUrl,
        basecampTaskTitle: matchedLog.taskTitle,
        designerCompletedAt: completionRole === "designer" ? matchedLog.endedAt : undefined,
        editorCompletedAt: completionRole === "editor" ? matchedLog.endedAt : undefined,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(plannerAssignments.id, assignment.assignmentId));
  }

  return refreshed;
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canManagePlanner(currentUser)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json(
    await buildPlannerSuggestions(monthKeyFromRequest(request), leadUserIdFromRequest(request), {
      preserveSavedAssignments: preserveSavedAssignmentsFromRequest(request),
    })
  );
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canManagePlanner(currentUser)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?: "save" | "refreshTracking";
    leadUserId?: string | null;
    monthKey?: string;
  } | null;
  const parsedMonth = parseMonthKey(body?.monthKey ?? null);
  const leadUserId = body?.leadUserId?.trim() || null;

  if (!parsedMonth) {
    return NextResponse.json({ error: "Valid month is required." }, { status: 400 });
  }

  if (body?.action === "refreshTracking") {
    const refreshed = await refreshCompletionsFromLogs(parsedMonth.monthKey, leadUserId);
    return NextResponse.json({
      ok: true,
      refreshed,
      ...(await buildPlannerSuggestions(parsedMonth.monthKey, leadUserId, { preserveSavedAssignments: true })),
    });
  }

  const payload = await buildPlannerSuggestions(parsedMonth.monthKey, leadUserId);
  const now = new Date().toISOString();
  const rows: NewPlannerAssignment[] = payload.suggestions.map((suggestion) => {
    const status: PlannerAssignmentStatus = suggestion.completedAt ? "completed" : suggestion.savedStatus ?? "suggested";

    return {
      id: createId(),
      deliverableId: suggestion.id,
      status,
      plannedWeek: suggestion.week,
      writerUserId: suggestion.writerUserId,
      writerDate: suggestion.writerDate,
      writerCompletedAt: suggestion.writerCompletedAt,
      designerUserId: suggestion.designerUserId,
      designerDate: suggestion.designerDate,
      designerCompletedAt: suggestion.designerCompletedAt,
      productionUserId: suggestion.productionUserId,
      productionDate: suggestion.productionDate,
      productionCompletedAt: suggestion.productionCompletedAt,
      editorUserId: suggestion.editorUserId,
      editorDate: suggestion.editorDate,
      editorCompletedAt: suggestion.editorCompletedAt,
      basecampTaskId: suggestion.basecampTaskId,
      basecampTaskUrl: suggestion.basecampTaskUrl,
      basecampTaskTitle: suggestion.basecampTaskTitle,
      completedAt: suggestion.completedAt,
      createdAt: now,
      updatedAt: now,
    };
  });

  if (rows.length > 0) {
    await db
      .insert(plannerAssignments)
      .values(rows)
      .onConflictDoUpdate({
        target: plannerAssignments.deliverableId,
        set: {
          status: sql`case when ${plannerAssignments.completedAt} is not null then 'completed' else excluded.status end`,
          plannedWeek: sql`excluded.planned_week`,
          writerUserId: sql`excluded.writer_user_id`,
          writerDate: sql`excluded.writer_date`,
          designerUserId: sql`excluded.designer_user_id`,
          designerDate: sql`excluded.designer_date`,
          productionUserId: sql`excluded.production_user_id`,
          productionDate: sql`excluded.production_date`,
          editorUserId: sql`excluded.editor_user_id`,
          editorDate: sql`excluded.editor_date`,
          updatedAt: now,
        },
      });
  }

  const refreshed = await refreshCompletionsFromLogs(parsedMonth.monthKey, leadUserId);

  return NextResponse.json({
    ok: true,
    saved: rows.length,
    refreshed,
    ...(await buildPlannerSuggestions(parsedMonth.monthKey, leadUserId, { preserveSavedAssignments: true })),
  });
}
