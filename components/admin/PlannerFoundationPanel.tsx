"use client";

import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";

type PlannerClient = {
  id: string;
  name: string;
  basecampProjectId: string | null;
  basecampProjectUrl: string | null;
  serviceType: "unset" | "social" | "performance" | "both" | "seo" | "website";
  leadUserId: string | null;
  accountManagerUserId: string | null;
  leadName: string | null;
  isActive: boolean;
};

type PlannerUser = {
  id: string;
  name: string;
  email: string;
  accessRole: string;
  departmentName: string | null;
};

type TeamMember = {
  clientId: string;
  userId: string;
  teamRole: "writer" | "designer" | "editor";
  userName: string;
};

type MonthlyPlan = {
  id: string;
  clientId: string;
  clientName: string;
  monthKey: string;
  socialStaticCount: number;
  socialCarouselCount: number;
  socialReelEditCount: number;
  socialAiVideoCount: number;
  performanceStaticCount: number;
  performanceCarouselCount: number;
  performanceReelEditCount: number;
  performanceAiVideoCount: number;
};

type Deliverable = {
  id: string;
  monthlyPlanId: string;
  serviceLine: string;
  deliverableType: string;
  sequence: number;
  title: string;
  shootRequired: boolean | null;
};

type PlannerAssignment = {
  id: string;
  deliverableId: string;
  status: string;
  plannedWeek: number;
  writerUserId: string | null;
  writerDate: string | null;
  writerCompletedAt: string | null;
  designerUserId: string | null;
  designerDate: string | null;
  designerCompletedAt: string | null;
  productionUserId: string | null;
  productionDate: string | null;
  productionCompletedAt: string | null;
  editorUserId: string | null;
  editorDate: string | null;
  editorCompletedAt: string | null;
  completedAt: string | null;
  basecampTaskUrl: string | null;
  basecampTaskTitle: string | null;
};

type WeeklySummary = {
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
  clients: Array<{
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
      deliverableType: string;
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
};

type SuggestionPayload = {
  monthKey: string;
  suggestions: Array<{
    id: string;
    clientId: string;
    date: string;
    week: number;
    clientName: string;
    title: string;
    serviceLine: string;
    deliverableType: string;
    writer: string | null;
    writerUserId: string | null;
    writerDate: string | null;
    writerCompletedAt: string | null;
    designer: string | null;
    designerUserId: string | null;
    designerDate: string | null;
    designerCompletedAt: string | null;
    editor: string | null;
    editorUserId: string | null;
    editorDate: string | null;
    editorCompletedAt: string | null;
    production: string | null;
    productionUserId: string | null;
    productionDate: string | null;
    productionCompletedAt: string | null;
    completionOwner: string;
    basecampTaskUrl: string | null;
    basecampTaskTitle: string | null;
    completedAt: string | null;
    savedStatus: string | null;
    status: "Good" | "Tight" | "Overloaded";
    notes: string[];
  }>;
  backlogSummary: Array<{
    userId: string;
    name: string;
    overdue: number;
    today: number;
    upcoming: number;
    pressure: number;
  }>;
  dayLoads: Array<{
    date: string;
    week: number;
    used: Record<string, number>;
    capacity: Record<string, number>;
  }>;
  weeklySummary: WeeklySummary[];
  calendarDays: PlannerCalendarDay[];
};

type SuggestionRow = SuggestionPayload["suggestions"][number];

type PlannerPayload = {
  clients: PlannerClient[];
  users: PlannerUser[];
  teamMembers: TeamMember[];
  monthlyPlans: MonthlyPlan[];
  deliverables: Deliverable[];
  assignments: PlannerAssignment[];
};

type AssignmentFilterRole = "all" | "writer" | "designer" | "editor" | "production";
type AssignmentRole = Exclude<AssignmentFilterRole, "all">;

const assignmentRoles: AssignmentRole[] = ["writer", "designer", "editor", "production"];

type Counts = {
  static: number;
  carousel: number;
  reelEdit: number;
  aiVideo: number;
};

const emptyCounts: Counts = { static: 0, carousel: 0, reelEdit: 0, aiVideo: 0 };

type TeamSelection = {
  writerIds: string[];
  designerIds: string[];
  editorIds: string[];
};

type PlannerCalendarDay = {
  date: string;
  day: number;
  dayName: string;
  week: number;
  status: "working" | "half_day" | "off";
  reason: string;
  capacityMultiplier: number;
};

const plannerMonthStorageKey = "blu-time-planner-month";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function isValidMonthKey(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

function monthKeyFromUrl() {
  if (typeof window === "undefined") return null;
  const month = new URLSearchParams(window.location.search).get("plannerMonth");
  return isValidMonthKey(month) ? month : null;
}

function monthKeyFromStorage() {
  if (typeof window === "undefined") return null;
  const month = window.localStorage.getItem(plannerMonthStorageKey);
  return isValidMonthKey(month) ? month : null;
}

function initialPlannerMonthKey() {
  return monthKeyFromUrl() ?? monthKeyFromStorage() ?? currentMonthKey();
}

function persistMonthKey(monthKey: string) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(plannerMonthStorageKey, monthKey);

  const url = new URL(window.location.href);
  url.searchParams.set("plannerMonth", monthKey);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function splitUsers(users: PlannerUser[]) {
  return {
    writers: users.filter((user) => user.departmentName === "Content Writer"),
    designers: users.filter((user) => user.departmentName === "Designer"),
    editors: users.filter((user) => user.departmentName === "Editor"),
  };
}

function defaultCountsFor(serviceType: PlannerClient["serviceType"]) {
  return {
    social:
      serviceType === "social" || serviceType === "both"
        ? { static: 10, carousel: 0, reelEdit: 5, aiVideo: 0 }
        : emptyCounts,
    performance:
      serviceType === "performance" || serviceType === "both"
        ? { static: 10, carousel: 0, reelEdit: 5, aiVideo: 0 }
        : emptyCounts,
  };
}

function shouldUseAjinLead(serviceType: PlannerClient["serviceType"]) {
  return serviceType === "seo" || serviceType === "website";
}

function ownerLabelForServiceType(serviceType: PlannerClient["serviceType"]) {
  if (serviceType === "seo" || serviceType === "website") return "SEO Manager";
  return "Account Manager";
}

function ownerPlaceholderForServiceType(serviceType: PlannerClient["serviceType"]) {
  if (serviceType === "seo" || serviceType === "website") return "No SEO manager";
  return "No account manager";
}

function ownerUsersForServiceType(users: PlannerUser[], serviceType: PlannerClient["serviceType"]) {
  return users.filter((user) => user.departmentName === ownerLabelForServiceType(serviceType));
}

function defaultLeadUserId(
  serviceType: PlannerClient["serviceType"],
  leadUserId: string | null,
  ajinUser?: PlannerUser
) {
  if (shouldUseAjinLead(serviceType) && ajinUser) return ajinUser.id;
  return leadUserId ?? "";
}

function defaultOwnerUserId(
  users: PlannerUser[],
  serviceType: PlannerClient["serviceType"],
  ownerUserId: string | null
) {
  const ownerUsers = ownerUsersForServiceType(users, serviceType);
  if (ownerUserId && ownerUsers.some((user) => user.id === ownerUserId)) return ownerUserId;
  return "";
}

function teamIdsFor(clientTeam: TeamMember[], teamRole: TeamMember["teamRole"]) {
  return clientTeam.filter((member) => member.teamRole === teamRole).map((member) => member.userId);
}

function toggleId(ids: string[], id: string) {
  if (ids.includes(id)) return ids.filter((item) => item !== id);
  return [...ids, id];
}

function selectedUsers(users: PlannerUser[], ids: string[]) {
  return users.filter((user) => ids.includes(user.id));
}

function assignmentForRole(
  item: SuggestionPayload["suggestions"][number],
  role: AssignmentRole
) {
  if (role === "writer") return { userId: item.writerUserId, name: item.writer };
  if (role === "designer") return { userId: item.designerUserId, name: item.designer };
  if (role === "editor") return { userId: item.editorUserId, name: item.editor };
  return { userId: item.productionUserId, name: item.production };
}

function assignmentDateForRole(item: SuggestionPayload["suggestions"][number], role: AssignmentRole) {
  if (role === "writer") return item.writerDate;
  if (role === "designer") return item.designerDate;
  if (role === "editor") return item.editorDate;
  return item.productionDate;
}

function assignmentsForItem(item: SuggestionPayload["suggestions"][number]) {
  return assignmentRoles.map((role) => assignmentForRole(item, role));
}

function focusDateForRow(row: SuggestionRow, role: AssignmentFilterRole, userId: string) {
  if (role !== "all") return assignmentDateForRole(row, role) ?? row.date;

  if (userId !== "all") {
    const matchingRole = assignmentRoles.find((assignmentRole) => assignmentForRole(row, assignmentRole).userId === userId);
    if (matchingRole) return assignmentDateForRole(row, matchingRole) ?? row.date;
  }

  return row.date;
}

function sortSuggestionRows(left: SuggestionRow, right: SuggestionRow, role: AssignmentFilterRole = "all", userId = "all") {
  const leftDate = focusDateForRow(left, role, userId);
  const rightDate = focusDateForRow(right, role, userId);

  return (
    leftDate.localeCompare(rightDate) ||
    left.clientName.localeCompare(right.clientName) ||
    left.title.localeCompare(right.title)
  );
}

function groupSuggestionRowsByWeek(
  rows: SuggestionRow[],
  calendarDays: PlannerCalendarDay[],
  role: AssignmentFilterRole,
  userId: string
) {
  const groups = new Map<number, SuggestionRow[]>();
  const weekRanges = new Map<number, { startDate: string; endDate: string }>();
  const weekByDate = new Map(calendarDays.map((day) => [day.date, day.week]));

  for (const day of calendarDays) {
    if (day.capacityMultiplier <= 0) continue;

    const existing = weekRanges.get(day.week);
    weekRanges.set(day.week, {
      startDate: existing?.startDate ?? day.date,
      endDate: day.date,
    });
  }

  for (const row of rows) {
    const workDate = focusDateForRow(row, role, userId);
    const week = weekByDate.get(workDate) ?? row.week;
    groups.set(week, [...(groups.get(week) ?? []), row]);
  }

  return [...groups.entries()]
    .sort(([leftWeek], [rightWeek]) => leftWeek - rightWeek)
    .map(([week, weekRows]) => {
      const sortedRows = [...weekRows].sort((left, right) => sortSuggestionRows(left, right, role, userId));
      const calendarRange = weekRanges.get(week);
      const dayCounts = [...sortedRows.reduce((counts, row) => {
        const workDate = focusDateForRow(row, role, userId);
        counts.set(workDate, (counts.get(workDate) ?? 0) + 1);
        return counts;
      }, new Map<string, number>()).entries()]
        .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
        .map(([date, count]) => ({ date, count }));

      return {
        week,
        startDate: calendarRange?.startDate ?? sortedRows[0]?.date ?? null,
        endDate: calendarRange?.endDate ?? sortedRows.at(-1)?.date ?? null,
        dayCounts,
        rows: sortedRows,
      };
    });
}

function firstActiveClient(clients: PlannerClient[]) {
  return clients.find((client) => client.isActive) ?? clients[0] ?? null;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;

  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(dateKey: string | null) {
  if (!dateKey) return "-";
  const [, month, day] = dateKey.split("-");
  return `${day}/${month}`;
}

function completionPercent(planned: number, completed: number) {
  if (planned <= 0) return 0;
  return Math.round((completed / planned) * 100);
}

function moveMonth(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function calendarPreviewForMonth(monthKey: string): PlannerCalendarDay[] {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return [];

  const lastDay = new Date(year, month, 0).getDate();
  const days: PlannerCalendarDay[] = [];
  let saturdayCount = 0;

  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;

    if (isSaturday) saturdayCount += 1;

    const isEvenSaturday = isSaturday && saturdayCount % 2 === 0;
    const isOddSaturday = isSaturday && saturdayCount % 2 === 1;
    const capacityMultiplier = isSunday || isEvenSaturday ? 0 : isOddSaturday ? 0.5 : 1;

    days.push({
      date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      day,
      dayName: date.toLocaleDateString(undefined, { weekday: "short" }),
      week: Math.ceil(day / 7),
      status: capacityMultiplier === 0 ? "off" : capacityMultiplier < 1 ? "half_day" : "working",
      reason: isSunday ? "Sunday off" : isEvenSaturday ? "Even Saturday off" : isOddSaturday ? "Odd Saturday half-day" : "Working day",
      capacityMultiplier,
    });
  }

  return days;
}

function calendarSummary(days: PlannerCalendarDay[]) {
  return {
    working: days.filter((day) => day.status === "working").length,
    halfDay: days.filter((day) => day.status === "half_day").length,
    off: days.filter((day) => day.status === "off").length,
  };
}

function countTotal(plan: MonthlyPlan) {
  return (
    plan.socialStaticCount +
    plan.socialCarouselCount +
    plan.socialReelEditCount +
    plan.socialAiVideoCount +
    plan.performanceStaticCount +
    plan.performanceCarouselCount +
    plan.performanceReelEditCount +
    plan.performanceAiVideoCount
  );
}

function plannerSuggestionScopeKey(monthKey: string, leadUserId: string | null) {
  return `${monthKey}:${leadUserId ?? "all"}`;
}

export function PlannerFoundationPanel() {
  const [data, setData] = useState<PlannerPayload | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [teamClientId, setTeamClientId] = useState("");
  const [planClientId, setPlanClientId] = useState("");
  const [routineLeadId, setRoutineLeadId] = useState("all");
  const [assignmentFilterClientId, setAssignmentFilterClientId] = useState("all");
  const [assignmentFilterRole, setAssignmentFilterRole] = useState<AssignmentFilterRole>("all");
  const [assignmentFilterUserId, setAssignmentFilterUserId] = useState("all");
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [socialCounts, setSocialCounts] = useState<Counts>({ static: 10, carousel: 0, reelEdit: 5, aiVideo: 0 });
  const [performanceCounts, setPerformanceCounts] = useState<Counts>({ static: 10, carousel: 0, reelEdit: 5, aiVideo: 0 });
  const [suggestions, setSuggestions] = useState<SuggestionPayload | null>(null);
  const [suggestionsScopeKey, setSuggestionsScopeKey] = useState("");
  const monthCalendar =
    suggestions?.monthKey === monthKey && suggestions.calendarDays
      ? suggestions.calendarDays
      : calendarPreviewForMonth(monthKey);

  async function loadPlanner() {
    setLoading(true);
    const response = await fetch("/api/admin/planner");
    const payload = (await response.json().catch(() => null)) as PlannerPayload & { error?: string } | null;
    setLoading(false);

    if (!response.ok || !payload) {
      setMessage(payload?.error ?? "Could not load planner.");
      return;
    }

    setData(payload);
    const firstSelectableClient = firstActiveClient(payload.clients);
    if (!firstSelectableClient) return;

    if (!teamClientId || !payload.clients.some((client) => client.id === teamClientId && client.isActive)) {
      setTeamClientId(firstSelectableClient.id);
    }

    if (!planClientId || !payload.clients.some((client) => client.id === planClientId && client.isActive)) {
      const defaults = defaultCountsFor(firstSelectableClient.serviceType);
      setPlanClientId(firstSelectableClient.id);
      setSocialCounts(defaults.social);
      setPerformanceCounts(defaults.performance);
    }
  }

  useEffect(() => {
    const initialMonth = initialPlannerMonthKey();
    setMonthKey(initialMonth);
    persistMonthKey(initialMonth);
    loadPlanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeClients = (data?.clients ?? []).filter((client) => client.isActive);
  const selectedTeamClient = data?.clients.find((client) => client.id === teamClientId) ?? null;
  const selectedPlanClient = data?.clients.find((client) => client.id === planClientId) ?? null;
  const roleUsers = useMemo(() => splitUsers(data?.users ?? []), [data?.users]);
  const clientTeam = (data?.teamMembers ?? []).filter((member) => member.clientId === teamClientId);
  const clientTeamSignature = clientTeam.map((member) => `${member.teamRole}:${member.userId}`).join("|");
  const selectedPlan = (data?.monthlyPlans ?? []).find(
    (plan) => plan.clientId === planClientId && plan.monthKey === monthKey
  );
  const leadUsers = (data?.users ?? []).filter((user) => user.accessRole === "lead");
  const selectedRoutineLead = leadUsers.find((user) => user.id === routineLeadId) ?? null;
  const routineLeadClients =
    routineLeadId === "all"
      ? activeClients
      : activeClients.filter((client) => client.leadUserId === routineLeadId);
  const ajinUser = (data?.users ?? []).find(
    (user) => user.email.toLowerCase() === "ajin@blusteak.com" || user.name.toLowerCase() === "ajin"
  );
  const selectedDeliverables = (data?.deliverables ?? []).filter(
    (deliverable) => deliverable.monthlyPlanId === selectedPlan?.id
  );
  const selectedDeliverableIds = new Set(selectedDeliverables.map((deliverable) => deliverable.id));
  const selectedAssignments = (data?.assignments ?? []).filter((assignment) =>
    selectedDeliverableIds.has(assignment.deliverableId)
  );
  const assignmentPersonOptions = useMemo(() => {
    const people = new Map<string, string>();

    for (const item of suggestions?.suggestions ?? []) {
      if (assignmentFilterClientId !== "all" && item.clientId !== assignmentFilterClientId) continue;

      const assignments =
        assignmentFilterRole === "all"
          ? assignmentsForItem(item)
          : [assignmentForRole(item, assignmentFilterRole)];

      for (const assignment of assignments) {
        if (assignment.userId && assignment.name) {
          people.set(assignment.userId, assignment.name);
        }
      }
    }

    return [...people.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [assignmentFilterClientId, assignmentFilterRole, suggestions?.suggestions]);
  const assignmentClientOptions = useMemo(() => {
    const clients = new Map<string, string>();

    for (const item of suggestions?.suggestions ?? []) {
      clients.set(item.clientId, item.clientName);
    }

    return [...clients.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [suggestions?.suggestions]);
  const filteredSuggestionRows = useMemo(() => {
    const rows = suggestions?.suggestions ?? [];

    return rows.filter((item) => {
      if (assignmentFilterClientId !== "all" && item.clientId !== assignmentFilterClientId) return false;

      if (assignmentFilterRole === "all" && assignmentFilterUserId === "all") return true;

      if (assignmentFilterRole === "all") {
        return assignmentsForItem(item).some((assignment) => assignment.userId === assignmentFilterUserId);
      }

      const assignment = assignmentForRole(item, assignmentFilterRole);
      if (assignmentFilterUserId === "all") return Boolean(assignment.userId || assignment.name);
      return assignment.userId === assignmentFilterUserId;
    }).sort((left, right) => sortSuggestionRows(left, right, assignmentFilterRole, assignmentFilterUserId));
  }, [assignmentFilterClientId, assignmentFilterRole, assignmentFilterUserId, suggestions?.suggestions]);
  const filteredSuggestionGroups = useMemo(
    () => groupSuggestionRowsByWeek(filteredSuggestionRows, monthCalendar, assignmentFilterRole, assignmentFilterUserId),
    [assignmentFilterRole, assignmentFilterUserId, filteredSuggestionRows, monthCalendar]
  );

  useEffect(() => {
    if (selectedPlan) {
      setSocialCounts({
        static: selectedPlan.socialStaticCount,
        carousel: selectedPlan.socialCarouselCount,
        reelEdit: selectedPlan.socialReelEditCount,
        aiVideo: selectedPlan.socialAiVideoCount,
      });
      setPerformanceCounts({
        static: selectedPlan.performanceStaticCount,
        carousel: selectedPlan.performanceCarouselCount,
        reelEdit: selectedPlan.performanceReelEditCount,
        aiVideo: selectedPlan.performanceAiVideoCount,
      });
      return;
    }

    const defaults = defaultCountsFor(selectedPlanClient?.serviceType ?? "unset");
    setSocialCounts(defaults.social);
    setPerformanceCounts(defaults.performance);
  }, [selectedPlan, selectedPlanClient?.serviceType]);

  function changeMonth(nextMonthKey: string) {
    if (!/^\d{4}-\d{2}$/.test(nextMonthKey)) return;
    setMonthKey(nextMonthKey);
    setSuggestions(null);
    setSuggestionsScopeKey("");
    persistMonthKey(nextMonthKey);
  }

  function routineLeadUserId() {
    return routineLeadId === "all" ? null : routineLeadId;
  }

  function suggestionUrl(targetMonthKey = monthKey, targetLeadUserId = routineLeadUserId(), restoreSaved = false) {
    const params = new URLSearchParams({ monthKey: targetMonthKey });
    const leadUserId = targetLeadUserId;
    if (leadUserId) params.set("leadUserId", leadUserId);
    if (restoreSaved) params.set("restore", "1");
    return `/api/admin/planner/suggestions?${params.toString()}`;
  }

  async function syncClients() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/planner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "syncClients" }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string; created?: number; updated?: number } | null;
    setSaving(false);

    if (!response.ok) {
      setMessage(payload?.error ?? "Could not sync clients.");
      return;
    }

    setMessage(`Basecamp sync complete. ${payload?.created ?? 0} created, ${payload?.updated ?? 0} updated.`);
    await loadPlanner();
  }

  async function saveLeadRoutinePlans() {
    const leadUserId = routineLeadUserId();

    if (!leadUserId) {
      setMessage("Choose one lead before generating lead-team monthly plans.");
      return;
    }

    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/planner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "saveLeadMonthlyPlans",
        leadUserId,
        monthKey,
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; created?: number; skipped?: number; updated?: number; clientCount?: number }
      | null;
    setSaving(false);

    if (!response.ok) {
      setMessage(payload?.error ?? "Could not create lead-team plans.");
      return;
    }

    setMessage(
      `${selectedRoutineLead?.name ?? "Lead"} routine foundation ready. ${payload?.created ?? 0} plans created, ${payload?.updated ?? 0} synced, ${payload?.skipped ?? 0} preserved.`
    );
    await loadPlanner();
    await loadSuggestions();
  }

  async function saveClient(client: PlannerClient, patch: Partial<PlannerClient>) {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/planner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateClient", clientId: client.id, ...client, ...patch }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string; regenerated?: boolean } | null;
    setSaving(false);

    if (!response.ok) {
      setMessage(payload?.error ?? "Could not save client.");
      return;
    }

    await loadPlanner();
  }

  async function saveTeam(team: TeamSelection) {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/planner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "saveTeam",
        clientId: teamClientId,
        writerIds: team.writerIds,
        designerIds: team.designerIds,
        editorIds: team.editorIds,
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string; regenerated?: boolean } | null;
    setSaving(false);

    if (!response.ok) {
      setMessage(payload?.error ?? "Could not save team.");
      return;
    }

    setMessage("Client team saved.");
    await loadPlanner();
  }

  async function saveMonthlyPlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!planClientId || !isValidMonthKey(monthKey)) {
      setMessage("Choose an active client and a valid month before saving the monthly plan.");
      return;
    }

    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/planner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "saveMonthlyPlan",
        plan: {
          clientId: planClientId,
          monthKey,
          social: socialCounts,
          performance: performanceCounts,
        },
      }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string; regenerated?: boolean } | null;
    setSaving(false);

    if (!response.ok) {
      setMessage(payload?.error ?? "Could not save monthly plan.");
      return;
    }

    setMessage(
      payload?.regenerated
        ? "Monthly plan saved and placeholder deliverables generated."
        : "Monthly plan saved. Existing scheduler assignments were preserved."
    );
    await loadPlanner();
    await loadSuggestions();
  }

  async function loadSuggestions(
    options: { silent?: boolean; targetMonthKey?: string; targetLeadUserId?: string | null; restoreSaved?: boolean } = {}
  ) {
    const targetMonthKey = options.targetMonthKey ?? monthKey;
    const targetLeadUserId = options.targetLeadUserId ?? routineLeadUserId();

    if (options.silent) {
      setSuggestionsLoading(true);
    } else {
      setSaving(true);
      setMessage("");
    }

    const response = await fetch(suggestionUrl(targetMonthKey, targetLeadUserId, options.restoreSaved ?? false));
    const payload = (await response.json().catch(() => null)) as SuggestionPayload & { error?: string } | null;

    if (options.silent) {
      setSuggestionsLoading(false);
    } else {
      setSaving(false);
    }

    if (!response.ok || !payload) {
      if (options.silent) setSuggestionsScopeKey(plannerSuggestionScopeKey(targetMonthKey, targetLeadUserId));
      if (!options.silent) setMessage(payload?.error ?? "Could not generate suggestions.");
      return;
    }

    setSuggestions(payload);
    setSuggestionsScopeKey(plannerSuggestionScopeKey(targetMonthKey, targetLeadUserId));
  }

  useEffect(() => {
    if (!data || loading) return;

    const leadUserId = routineLeadUserId();
    const currentScopeKey = plannerSuggestionScopeKey(monthKey, leadUserId);
    if (suggestionsScopeKey === currentScopeKey || suggestionsLoading) return;

    const activeClientIds = new Set(
      data.clients
        .filter((client) => client.isActive && (!leadUserId || client.leadUserId === leadUserId))
        .map((client) => client.id)
    );
    const hasPlansForScope = data.monthlyPlans.some(
      (plan) => plan.monthKey === monthKey && activeClientIds.has(plan.clientId)
    );

    if (!hasPlansForScope) {
      setSuggestions(null);
      setSuggestionsScopeKey(currentScopeKey);
      return;
    }

    void loadSuggestions({ silent: true, targetMonthKey: monthKey, targetLeadUserId: leadUserId, restoreSaved: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loading, monthKey, routineLeadId, suggestionsLoading, suggestionsScopeKey]);

  async function saveSuggestions() {
    if (!isValidMonthKey(monthKey)) {
      setMessage("Choose a valid month before saving scheduler assignments.");
      return;
    }

    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/planner/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", leadUserId: routineLeadUserId(), monthKey }),
    });
    const payload = (await response.json().catch(() => null)) as
      | (SuggestionPayload & { error?: string; saved?: number; refreshed?: number })
      | null;
    setSaving(false);

    if (!response.ok || !payload) {
      setMessage(payload?.error ?? "Could not save scheduler assignments.");
      return;
    }

    setSuggestions(payload);
    setSuggestionsScopeKey(plannerSuggestionScopeKey(monthKey, routineLeadUserId()));
    setMessage(
      `Scheduler assignments saved for ${formatMonthLabel(monthKey)}. ${payload.saved ?? 0} deliverables are now trackable, ${payload.refreshed ?? 0} matched from logs.`
    );
    await loadPlanner();
  }

  async function refreshTracking() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/planner/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refreshTracking", leadUserId: routineLeadUserId(), monthKey }),
    });
    const payload = (await response.json().catch(() => null)) as
      | (SuggestionPayload & { error?: string; refreshed?: number })
      | null;
    setSaving(false);

    if (!response.ok || !payload) {
      setMessage(payload?.error ?? "Could not refresh planner tracking.");
      return;
    }

    setSuggestions(payload);
    setSuggestionsScopeKey(plannerSuggestionScopeKey(monthKey, routineLeadUserId()));
    setMessage(`${payload.refreshed ?? 0} deliverables matched from completed timer logs.`);
    await loadPlanner();
  }

  function selectPlanClient(clientId: string) {
    setPlanClientId(clientId);
    setSuggestions(null);
    setSuggestionsScopeKey("");

    const client = data?.clients.find((item) => item.id === clientId);
    const plan = data?.monthlyPlans.find((item) => item.clientId === clientId && item.monthKey === monthKey);

    if (plan) {
      setSocialCounts({
        static: plan.socialStaticCount,
        carousel: plan.socialCarouselCount,
        reelEdit: plan.socialReelEditCount,
        aiVideo: plan.socialAiVideoCount,
      });
      setPerformanceCounts({
        static: plan.performanceStaticCount,
        carousel: plan.performanceCarouselCount,
        reelEdit: plan.performanceReelEditCount,
        aiVideo: plan.performanceAiVideoCount,
      });
      return;
    }

    const defaults = defaultCountsFor(client?.serviceType ?? "unset");
    setSocialCounts(defaults.social);
    setPerformanceCounts(defaults.performance);
  }

  return (
    <section className="card mt-4 rounded-2xl p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">planner foundation</p>
          <h2 className="mt-1 text-3xl font-bold">Clients, teams, monthly plans</h2>
          <p className="mt-2 text-base text-muted">
            This is the data foundation for the future scheduler suggestion board.
          </p>
        </div>
        <button
          type="button"
          onClick={syncClients}
          disabled={saving}
          className="rounded-xl bg-[var(--primary)] px-5 py-3 text-base font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Working..." : "Sync Basecamp clients"}
        </button>
      </div>

      {loading ? <p className="mt-4 text-base text-muted">Loading planner setup...</p> : null}
      {message ? <p className="mt-4 text-base text-muted">{message}</p> : null}

      <div className="mt-8 grid gap-6">
        <div className="rounded-2xl border border-[var(--border)] p-6">
          <h3 className="text-2xl font-semibold">Client setup</h3>
          <div className="mt-5 max-h-[720px] overflow-auto pr-1">
            <table className="data-table min-w-[1380px]">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Lead</th>
                  <th>Manager</th>
                  <th>Status</th>
                  <th>Save</th>
                </tr>
              </thead>
              <tbody>
                {(data?.clients ?? []).map((client) => (
                  <ClientSetupRow
                    key={`${client.id}-${client.name}-${client.serviceType}-${client.leadUserId ?? ""}-${client.accountManagerUserId ?? ""}-${client.isActive}`}
                    ajinUser={ajinUser}
                    client={client}
                    leadUsers={leadUsers}
                    onSave={saveClient}
                    users={data?.users ?? []}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <TeamMappingPanel
          key={`${teamClientId}-${clientTeamSignature}`}
          clients={activeClients}
          clientTeam={clientTeam}
          onClientChange={setTeamClientId}
          onSave={saveTeam}
          roleUsers={roleUsers}
          saving={saving}
          selectedClient={selectedTeamClient}
          selectedClientId={teamClientId}
        />

        <div className="grid gap-6">
          <div className="rounded-2xl border border-[var(--border)] p-6">
            <h3 className="text-2xl font-semibold">Monthly deliverable plan</h3>
            <p className="mt-1 text-base text-muted">Generate placeholder rows for the selected client and month.</p>
            <form onSubmit={saveMonthlyPlan} className="mt-4 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={planClientId}
                  onChange={(event) => selectPlanClient(event.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                >
                  {activeClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                <input
                  type="month"
                  value={monthKey}
                  onChange={(event) => changeMonth(event.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                />
              </div>

              <MonthNavigator monthKey={monthKey} onChange={changeMonth} />

              <div className="grid gap-3 md:grid-cols-2">
                <CountEditor title="Social" counts={socialCounts} onChange={setSocialCounts} />
                <CountEditor title="Performance" counts={performanceCounts} onChange={setPerformanceCounts} />
              </div>

              <button
                type="submit"
                disabled={saving || !selectedPlanClient}
                className="rounded-xl bg-[var(--primary)] px-4 py-3 font-semibold text-white disabled:opacity-60"
              >
                Save {formatMonthLabel(monthKey)} plan
              </button>
            </form>

            {selectedPlan ? (
              <div className="mt-4 rounded-xl bg-[var(--surface-soft)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">
                    {selectedPlan.clientName} / {selectedPlan.monthKey}
                  </p>
                  <div className="text-right">
                    <strong>{countTotal(selectedPlan)} deliverables</strong>
                    <p className="text-xs text-muted">{selectedAssignments.length} scheduler assignments saved</p>
                  </div>
                </div>
                <div className="mt-3 grid max-h-52 gap-2 overflow-auto">
                  {selectedDeliverables.map((deliverable) => (
                    <div key={deliverable.id} className="rounded-lg bg-[var(--surface)] px-3 py-2 text-sm">
                      {deliverable.title}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--border)] p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold">Suggestion board</h3>
            <p className="mt-1 text-base text-muted">
              {formatMonthLabel(monthKey)} recommendations for{" "}
              {selectedRoutineLead ? `${selectedRoutineLead.name}'s lead team` : "all active clients"}, recalculated from monthly plans,
              mapped teams, and Basecamp backlog pressure.
            </p>
            <p className="mt-1 text-sm text-muted">
              {routineLeadClients.length} active clients in this routine scope.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={routineLeadId}
              onChange={(event) => {
                setRoutineLeadId(event.target.value);
                setSuggestions(null);
                setSuggestionsScopeKey("");
              }}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base"
            >
              <option value="all">All leads / company</option>
              {leadUsers.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name}
                </option>
              ))}
            </select>
            <input
              type="month"
              value={monthKey}
              onChange={(event) => changeMonth(event.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base"
            />
            <button
              type="button"
              onClick={saveLeadRoutinePlans}
              disabled={saving || routineLeadId === "all"}
              className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold disabled:opacity-60"
            >
              Create lead plans
            </button>
            <button
              type="button"
              onClick={() => loadSuggestions()}
              disabled={saving}
              className="rounded-xl bg-[var(--primary)] px-5 py-3 font-semibold text-white disabled:opacity-60"
            >
              Generate suggestions
            </button>
            <button
              type="button"
              onClick={saveSuggestions}
              disabled={saving || !suggestions}
              className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold disabled:opacity-60"
            >
              Save scheduler plan
            </button>
            <button
              type="button"
              onClick={refreshTracking}
              disabled={saving}
              className="rounded-xl border border-[var(--border)] px-5 py-3 font-semibold disabled:opacity-60"
            >
              Refresh tracking
            </button>
          </div>
        </div>

        <CalendarPreview days={monthCalendar} monthKey={monthKey} />

        {suggestionsLoading ? (
          <p className="mt-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 text-base text-muted">
            Loading saved scheduler plan...
          </p>
        ) : null}

        {suggestions ? (
          <div className="mt-4 grid gap-4">
            <WeeklyPlannerDashboard weeklySummary={suggestions.weeklySummary} />

            <div className="grid gap-3 md:grid-cols-3">
              {suggestions.backlogSummary.slice(0, 6).map((item) => (
                <div key={item.userId} className="rounded-xl bg-[var(--surface-soft)] p-3">
                  <p className="font-semibold">{item.name}</p>
                  <p className="mt-1 text-sm">
                    <span className="text-red-300">{item.overdue} overdue</span>{" "}
                    <span className="text-yellow-300">{item.today} today</span>{" "}
                    <span className="text-green-300">{item.upcoming} upcoming</span>
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h4 className="text-2xl font-semibold">Detailed task list</h4>
                  <p className="mt-1 text-base text-muted">
                    Showing {filteredSuggestionRows.length} of {suggestions.suggestions.length} planned rows.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAssignmentFilterClientId("all");
                    setAssignmentFilterRole("all");
                    setAssignmentFilterUserId("all");
                  }}
                  className="rounded-xl border border-[var(--border)] px-4 py-3 text-base font-semibold"
                >
                  Clear filters
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-muted">Client</span>
                  <select
                    value={assignmentFilterClientId}
                    onChange={(event) => setAssignmentFilterClientId(event.target.value)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base"
                  >
                    <option value="all">All clients</option>
                    {assignmentClientOptions.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-muted">Role</span>
                  <select
                    value={assignmentFilterRole}
                    onChange={(event) => {
                      setAssignmentFilterRole(event.target.value as AssignmentFilterRole);
                      setAssignmentFilterUserId("all");
                    }}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base"
                  >
                    <option value="all">All roles</option>
                    <option value="writer">Writer</option>
                    <option value="designer">Designer</option>
                    <option value="editor">Editor</option>
                    <option value="production">Production</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-muted">Person</span>
                  <select
                    value={assignmentFilterUserId}
                    onChange={(event) => setAssignmentFilterUserId(event.target.value)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base"
                  >
                    <option value="all">All people</option>
                    {assignmentPersonOptions.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {filteredSuggestionGroups.length > 0 ? (
              <div className="grid gap-5">
                {filteredSuggestionGroups.map((group) => (
                  <section
                    key={group.week}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5"
                  >
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted">
                          {formatShortDate(group.startDate)} - {formatShortDate(group.endDate)}
                        </p>
                        <h4 className="mt-1 text-3xl font-semibold">Week {group.week}</h4>
                      </div>
                      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-5 py-3 text-right">
                        <p className="text-sm text-muted">Planned tasks</p>
                        <strong className="text-2xl">{group.rows.length}</strong>
                      </div>
                    </div>

                    {group.dayCounts.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {group.dayCounts.map((day) => (
                          <span
                            key={day.date}
                            className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold"
                          >
                            {formatShortDate(day.date)}: {day.count}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-5 grid gap-3">
                      {group.rows.map((item) => (
                        <DetailedTaskCard key={item.id} item={item} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-6 text-center text-muted">
                No planned tasks match this filter.
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 text-base text-muted">
            Save at least one monthly plan, then generate suggestions for the selected month.
          </p>
        )}
      </div>
    </section>
  );
}

function WeeklyPlannerDashboard({ weeklySummary }: { weeklySummary: WeeklySummary[] }) {
  const activeWeeks = weeklySummary.filter((week) => week.planned > 0);
  const totalPlanned = activeWeeks.reduce((sum, week) => sum + week.planned, 0);
  const totalCompleted = activeWeeks.reduce((sum, week) => sum + week.completed, 0);
  const maxWeeklyPlanned = Math.max(...activeWeeks.map((week) => week.planned), 1);

  if (activeWeeks.length === 0) {
    return (
      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-5">
        <h4 className="text-xl font-semibold">Week-wise delivery dashboard</h4>
        <p className="mt-2 text-base text-muted">No deliverables found for this month yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">delivery dashboard</p>
          <h4 className="mt-1 text-3xl font-semibold">Week-wise client routine</h4>
          <p className="mt-2 text-base text-muted">Each week shows the client outputs and the people assigned to move them.</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-5 py-4 text-right">
          <p className="text-sm text-muted">Month target</p>
          <strong className="text-2xl">{totalCompleted} / {totalPlanned} outputs</strong>
        </div>
      </div>

      <div className="mt-6 grid gap-6">
        {activeWeeks.map((week) => {
          const percent = completionPercent(week.planned, week.completed);
          const plannedWidth = Math.max(10, Math.round((week.planned / maxWeeklyPlanned) * 100));

          return (
            <article key={week.week} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-6">
              <div className="grid gap-5 lg:grid-cols-[260px_1fr] lg:items-center">
                <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5">
                  <p className="text-base text-muted">{formatShortDate(week.startDate)} - {formatShortDate(week.endDate)}</p>
                  <h5 className="mt-2 text-4xl font-bold">Week {week.week}</h5>
                  <p className="mt-2 text-base text-muted">{week.clients.length} clients</p>
                </div>

                <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted">Outputs to deliver</p>
                      <strong className="text-4xl">{week.planned}</strong>
                    </div>
                    <span className="rounded-full bg-[var(--primary-glow)] px-4 py-2 text-base font-semibold">
                      {week.completed} done
                    </span>
                  </div>

                  <div className="h-5 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                    <div
                      className="h-full rounded-full bg-[var(--primary-glow)]"
                      style={{ width: `${plannedWidth}%` }}
                    >
                      <div
                        className="h-full rounded-full bg-[var(--primary)]"
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-5">
                {week.clients.map((client) => (
                  <ClientWeekBreakdown key={client.clientName} client={client} />
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ClientWeekBreakdown({ client }: { client: WeeklySummary["clients"][number] }) {
  const percent = completionPercent(client.planned, client.completed);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h6 className="text-2xl font-semibold">{client.clientName}</h6>
          <p className="mt-2 text-base text-muted">
            {client.social} SM / {client.performance} Perf
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <span className="rounded-full bg-[var(--primary-glow)] px-4 py-2 text-base font-semibold">
            {client.planned} outputs
          </span>
          {client.completed > 0 ? (
            <span className="rounded-full bg-[var(--success-soft)] px-4 py-2 text-base font-semibold text-[var(--success)]">
              {client.completed} done
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--surface-soft)]">
        <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${Math.min(100, percent)}%` }} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="grid flex-1 grid-cols-2 gap-3 text-base sm:grid-cols-4">
          <OutputCount label="Static" value={client.static} />
          <OutputCount label="Carousel" value={client.carousel} />
          <OutputCount label="Reels" value={client.reelEdit} />
          <OutputCount label="AI" value={client.aiVideo} />
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="min-w-36 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-5 py-3 text-base font-semibold"
        >
          {isOpen ? "Close" : `View ${client.items.length}`}
        </button>
      </div>

      {isOpen ? (
        <div className="mt-5 grid gap-3">
          {client.items.map((item, index) => (
            <div key={`${item.title}-${index}`} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <strong className="block text-lg">{item.title}</strong>
                  <span className="mt-1 block text-sm text-muted">
                    {item.serviceLine} / {item.deliverableType}
                  </span>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <AssignmentChip label="Writer" name={item.writer} date={item.writerDate} />
                <AssignmentChip label="Designer" name={item.designer} date={item.designerDate} />
                <AssignmentChip label="Production" name={item.production} date={item.productionDate} />
                <AssignmentChip label="Editor" name={item.editor} date={item.editorDate} />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function OutputCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3">
      <strong className="block text-2xl leading-none">{value}</strong>
      <span className="mt-1 block text-sm text-muted">{label}</span>
    </div>
  );
}

function AssignmentChip({ date, label, name }: { date: string | null; label: string; name: string | null }) {
  if (!name && !date) return null;

  return (
    <span className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3">
      <span className="block text-xs font-semibold uppercase text-muted">{label}</span>
      <strong className="mt-1 block text-base">{name ?? "-"}</strong>
      <span className="mt-1 block text-xs text-muted">{formatShortDate(date)}</span>
    </span>
  );
}

function DetailedTaskCard({ item }: { item: SuggestionRow }) {
  return (
    <article className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
      <div className="grid gap-4 xl:grid-cols-[150px_1fr]">
        <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
          <p className="text-sm text-muted">Final date</p>
          <strong className="mt-1 block text-xl">{formatShortDate(item.date)}</strong>
          <p className="mt-2 text-xs text-muted">{item.date}</p>
        </div>

        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">
                {item.clientName}
              </p>
              <h5 className="mt-1 text-xl font-semibold">{item.title}</h5>
              <p className="mt-1 text-sm text-muted">
                {item.serviceLine} / {item.deliverableType}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span
                className={
                  item.status === "Good"
                    ? "rounded-full bg-[var(--success-soft)] px-3 py-1 text-sm font-semibold text-[var(--success)]"
                    : item.status === "Tight"
                      ? "rounded-full bg-[var(--warning-soft)] px-3 py-1 text-sm font-semibold text-[var(--warning)]"
                      : "rounded-full bg-[var(--danger-soft)] px-3 py-1 text-sm font-semibold text-[var(--danger)]"
                }
              >
                {item.status}
              </span>
              <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-sm font-semibold">
                {item.completedAt ? "Completed" : item.savedStatus ? "Saved / pending" : "Not saved"}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StagePill name={item.writer} date={item.writerDate} completedAt={item.writerCompletedAt} label="Writer" />
            <StagePill name={item.designer} date={item.designerDate} completedAt={item.designerCompletedAt} label="Designer" />
            <StagePill name={item.production} date={item.productionDate} completedAt={item.productionCompletedAt} label="Production" />
            <StagePill name={item.editor} date={item.editorDate} completedAt={item.editorCompletedAt} label="Editor" />
          </div>

          {item.basecampTaskUrl || item.notes.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {item.basecampTaskUrl ? (
                <a href={item.basecampTaskUrl} target="_blank" rel="noreferrer" className="font-semibold text-[var(--primary)]">
                  Basecamp task
                </a>
              ) : null}
              {item.notes.length > 0 ? <span className="text-muted">{item.notes.join(", ")}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function StagePill({
  completedAt,
  date,
  label,
  name,
}: {
  completedAt: string | null;
  date: string | null;
  label?: string;
  name: string | null;
}) {
  if (!name && !date) {
    return (
      <span className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-3 text-muted">
        {label ? <span className="block text-xs font-semibold uppercase text-muted">{label}</span> : null}
        -
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-3">
      {label ? <span className="block text-xs font-semibold uppercase text-muted">{label}</span> : null}
      <strong className="mt-1 block">{name ?? "Unassigned"}</strong>
      <span className="mt-2 inline-flex rounded-full bg-[var(--surface-soft)] px-2 py-1 text-xs text-muted">
        {formatShortDate(date)}
      </span>
      {completedAt ? <span className="ml-2 text-xs text-green-300">done</span> : null}
    </div>
  );
}

function MonthNavigator({ monthKey, onChange }: { monthKey: string; onChange: (monthKey: string) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">planning month</p>
        <h4 className="mt-1 text-xl font-semibold">{formatMonthLabel(monthKey)}</h4>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(moveMonth(monthKey, -1))}
          className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onChange(currentMonthKey())}
          className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold"
        >
          Current
        </button>
        <button
          type="button"
          onClick={() => onChange(moveMonth(monthKey, 1))}
          className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function CalendarPreview({ days, monthKey }: { days: PlannerCalendarDay[]; monthKey: string }) {
  const summary = calendarSummary(days);

  return (
    <section className="mt-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">working calendar</p>
          <h4 className="mt-1 text-xl font-semibold">{formatMonthLabel(monthKey)}</h4>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-[var(--success-soft)] px-3 py-1 font-semibold text-[var(--success)]">
            {summary.working} full days
          </span>
          <span className="rounded-full bg-[var(--warning-soft)] px-3 py-1 font-semibold text-[var(--warning)]">
            {summary.halfDay} half days
          </span>
          <span className="rounded-full bg-[var(--danger-soft)] px-3 py-1 font-semibold text-[var(--danger)]">
            {summary.off} off days
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((day) => (
          <div
            key={day.date}
            title={`${day.date}: ${day.reason}`}
            className={`min-h-20 rounded-xl border p-2 ${
              day.status === "working"
                ? "border-[var(--success-border)] bg-[var(--success-soft)]"
                : day.status === "half_day"
                  ? "border-[var(--warning-border)] bg-[var(--warning-soft)]"
                  : "border-[var(--danger-border)] bg-[var(--danger-soft)] opacity-75"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <strong className="text-lg leading-none">{day.day}</strong>
              <span className="text-xs font-semibold uppercase text-muted">{day.dayName}</span>
            </div>
            <p className="mt-3 text-xs font-semibold leading-tight">{day.reason}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TeamMappingPanel({
  clients,
  clientTeam,
  onClientChange,
  onSave,
  roleUsers,
  saving,
  selectedClient,
  selectedClientId,
}: {
  clients: PlannerClient[];
  clientTeam: TeamMember[];
  onClientChange: (clientId: string) => void;
  onSave: (team: TeamSelection) => Promise<void>;
  roleUsers: ReturnType<typeof splitUsers>;
  saving: boolean;
  selectedClient: PlannerClient | null;
  selectedClientId: string;
}) {
  const [writerIds, setWriterIds] = useState(teamIdsFor(clientTeam, "writer"));
  const [designerIds, setDesignerIds] = useState(teamIdsFor(clientTeam, "designer"));
  const [editorIds, setEditorIds] = useState(teamIdsFor(clientTeam, "editor"));
  const totalSelected = writerIds.length + designerIds.length + editorIds.length;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-sm)]">
      <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.75fr)_1fr]">
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">client team</p>
          <h3 className="mt-2 text-2xl font-semibold">Team mapping</h3>
          <select
            value={selectedClientId}
            onChange={(event) => onClientChange(event.target.value)}
            className="mt-5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base font-semibold"
          >
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-sm text-muted">Selected client</p>
            <h4 className="mt-1 text-xl font-semibold">{selectedClient?.name ?? "No client selected"}</h4>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <TeamCount label="Writers" value={writerIds.length} />
              <TeamCount label="Designers" value={designerIds.length} />
              <TeamCount label="Editors" value={editorIds.length} />
            </div>
            <p className="mt-4 text-sm text-muted">{totalSelected} people mapped to this client</p>
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onSave({ writerIds, designerIds, editorIds });
          }}
          className="grid gap-4"
        >
          <div className="grid gap-4 xl:grid-cols-3">
            <TeamRolePicker
              label="Writers"
              selectedIds={writerIds}
              setSelectedIds={setWriterIds}
              users={roleUsers.writers}
            />
            <TeamRolePicker
              label="Designers"
              selectedIds={designerIds}
              setSelectedIds={setDesignerIds}
              users={roleUsers.designers}
            />
            <TeamRolePicker
              label="Editors"
              selectedIds={editorIds}
              setSelectedIds={setEditorIds}
              users={roleUsers.editors}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-4">
            <div>
              <p className="text-base font-semibold">{selectedClient?.name ?? "Client"} team</p>
              <p className="text-sm text-muted">
                {writerIds.length} writers, {designerIds.length} designers, {editorIds.length} editors
              </p>
            </div>
            <button
              type="submit"
              disabled={saving || !selectedClientId}
              className="rounded-xl bg-[var(--primary)] px-6 py-3 text-base font-semibold text-white disabled:opacity-60"
            >
              Save team mapping
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function TeamCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-elevated)] px-3 py-2">
      <strong className="block text-lg leading-none">{value}</strong>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

function TeamRolePicker({
  label,
  selectedIds,
  setSelectedIds,
  users,
}: {
  label: string;
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  users: PlannerUser[];
}) {
  const picks = selectedUsers(users, selectedIds);

  return (
    <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xl font-semibold">{label}</h4>
        <span className="badge badge-primary">{selectedIds.length} selected</span>
      </div>

      <div className="mt-3 min-h-12 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] p-3">
        {picks.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {picks.map((user) => (
              <span key={user.id} className="rounded-full bg-[var(--primary-glow)] px-3 py-1 text-sm font-semibold">
                {user.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No {label.toLowerCase()} selected</p>
        )}
      </div>

      <div className="scroll-area mt-4 grid max-h-[360px] gap-2 overflow-auto pr-1">
        {users.map((user) => {
          const checked = selectedIds.includes(user.id);

          return (
            <label
              key={user.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition ${
                checked
                  ? "border-[var(--primary)] bg-[var(--primary-glow)]"
                  : "border-[var(--border-soft)] bg-[var(--surface-elevated)] hover:border-[var(--border-strong)]"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => setSelectedIds((current) => toggleId(current, user.id))}
                className="mt-1 h-5 w-5 accent-[var(--primary)]"
              />
              <span>
                <span className="block text-base font-semibold leading-tight">{user.name}</span>
                <span className="mt-1 block text-xs text-muted">{user.email}</span>
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

function ClientSetupRow({
  ajinUser,
  client,
  leadUsers,
  onSave,
  users,
}: {
  ajinUser?: PlannerUser;
  client: PlannerClient;
  leadUsers: PlannerUser[];
  onSave: (client: PlannerClient, patch: Partial<PlannerClient>) => Promise<void>;
  users: PlannerUser[];
}) {
  const [name, setName] = useState(client.name);
  const [serviceType, setServiceType] = useState<PlannerClient["serviceType"]>(client.serviceType);
  const [leadUserId, setLeadUserId] = useState(defaultLeadUserId(client.serviceType, client.leadUserId, ajinUser));
  const [ownerUserId, setOwnerUserId] = useState(
    defaultOwnerUserId(users, client.serviceType, client.accountManagerUserId)
  );
  const [isActive, setIsActive] = useState(client.isActive);

  const ownerUsers = useMemo(() => ownerUsersForServiceType(users, serviceType), [serviceType, users]);
  const ownerLabel = ownerLabelForServiceType(serviceType);

  function changeServiceType(nextServiceType: PlannerClient["serviceType"]) {
    const nextOwnerUsers = ownerUsersForServiceType(users, nextServiceType);

    setServiceType(nextServiceType);
    setOwnerUserId((currentOwnerId) =>
      nextOwnerUsers.some((user) => user.id === currentOwnerId) ? currentOwnerId : ""
    );

    if (shouldUseAjinLead(nextServiceType) && ajinUser) {
      setLeadUserId(ajinUser.id);
    }
  }

  return (
    <tr>
      <td>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full min-w-72 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base"
        />
      </td>
      <td>
        <select
          value={serviceType}
          onChange={(event) => changeServiceType(event.target.value as PlannerClient["serviceType"])}
          className="w-full min-w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base"
        >
          <option value="unset">Unset</option>
          <option value="social">Social</option>
          <option value="performance">Performance</option>
          <option value="both">Social + Performance</option>
          <option value="seo">SEO</option>
          <option value="website">Website</option>
        </select>
      </td>
      <td>
        <select
          value={leadUserId}
          onChange={(event) => setLeadUserId(event.target.value)}
          className="w-full min-w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base"
        >
          <option value="">No lead</option>
          {leadUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select
          value={ownerUserId}
          onChange={(event) => setOwnerUserId(event.target.value)}
          className="w-full min-w-60 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base"
        >
          <option value="">{ownerPlaceholderForServiceType(serviceType)}</option>
          {ownerUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">{ownerLabel}</p>
      </td>
      <td>
        <select
          value={isActive ? "active" : "inactive"}
          onChange={(event) => setIsActive(event.target.value === "active")}
          className="w-full min-w-36 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base"
        >
          <option value="active">Active</option>
          <option value="inactive">Hidden</option>
        </select>
      </td>
      <td>
        <button
          type="button"
          onClick={() =>
            onSave(client, {
              name,
              serviceType,
              leadUserId,
              accountManagerUserId: ownerUserId,
              isActive,
            })
          }
          className="rounded-xl border border-[var(--border)] px-5 py-3 text-base font-semibold"
        >
          Save
        </button>
      </td>
    </tr>
  );
}

function CountEditor({
  title,
  counts,
  onChange,
}: {
  title: string;
  counts: Counts;
  onChange: (counts: Counts) => void;
}) {
  function update(key: keyof Counts, value: string) {
    onChange({ ...counts, [key]: Math.max(0, Math.floor(Number(value) || 0)) });
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <h4 className="font-semibold">{title}</h4>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <NumberField label="Static" value={counts.static} onChange={(value) => update("static", value)} />
        <NumberField label="Carousel" value={counts.carousel} onChange={(value) => update("carousel", value)} />
        <NumberField label="Reel edit" value={counts.reelEdit} onChange={(value) => update("reelEdit", value)} />
        <NumberField label="AI video" value={counts.aiVideo} onChange={(value) => update("aiVideo", value)} />
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-sm text-muted">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
      />
    </label>
  );
}
