import type { CampaignRule, MemberAvailability, RoutineItem, TeamMember, TimeLog } from "../types";

type WeeklyRoutineTrackerProps = {
  items: RoutineItem[];
  campaignRules: CampaignRule[];
  availability: MemberAvailability[];
  logs: TimeLog[];
  members: TeamMember[];
  highlightedPersonName?: string;
};

type CampaignFamily = "social_media" | "performance";

type ClientWeekSummary = {
  key: string;
  clientName: string;
  family: CampaignFamily;
  monthlyTotal: number;
  week1Target: number;
  week1Done: number;
  week2Target: number;
  week2Done: number;
  week3Target: number;
  week3Done: number;
  week4Target: number;
  week4Done: number;
  totalDone: number;
};

function normalizeClientName(value: string) {
  return value.trim().toLowerCase();
}

function getWeekNumber(dateKey: string, weekStartDate: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  const startDate = new Date(`${weekStartDate}T00:00:00`);
  const dayOffset = Math.max(
    0,
    Math.floor((date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
  );

  return Math.floor(dayOffset / 7) + 1;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatShortDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getWeekDateLabel(weekItems: RoutineItem[]) {
  const dates = Array.from(new Set(weekItems.map((item) => item.work_date))).sort();
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];

  if (!firstDate) return "";
  if (firstDate === lastDate) return formatShortDate(firstDate);

  return `${formatShortDate(firstDate)} - ${formatShortDate(lastDate)}`;
}

function getStatus(item: RoutineItem) {
  if (item.completed_count >= item.planned_count) return "Done";
  if (item.completed_count > 0) return "In progress";
  return "Pending";
}

function isTrackedRole(role: string) {
  return role === "designer" || role === "editor";
}

function isTrackedFamily(campaignType: string): campaignType is CampaignFamily {
  return campaignType === "social_media" || campaignType === "performance";
}

function getFamilyLabel(family: CampaignFamily) {
  return family === "social_media" ? "Social media" : "Performance";
}

function getRuleDeliverableTotal(rule: CampaignRule) {
  return (
    rule.static_count +
    rule.canva_count +
    (rule.ai_video_count ?? 0) +
    (rule.shoot_video_count ?? 0)
  );
}

function getPercent(value: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function isHighlightedPerson(item: RoutineItem, highlightedPersonName?: string) {
  if (!highlightedPersonName) return false;

  return (
    item.person_name.trim().toLowerCase() ===
    highlightedPersonName.trim().toLowerCase()
  );
}

function extractOriginalRoutineItemId(note?: string | null) {
  if (!note) return null;

  const match = note.match(/\(orig:([^)]+)\)/);
  return match?.[1] ?? null;
}

export function WeeklyRoutineTracker({
  items,
  campaignRules,
  availability,
  logs,
  members,
  highlightedPersonName,
}: WeeklyRoutineTrackerProps) {
  const weekStartDate =
    [...items].sort((a, b) => a.work_date.localeCompare(b.work_date))[0]?.work_date ??
    "2026-05-01";
  const groupedByWeek = new Map<number, RoutineItem[]>();

  for (const item of items) {
    const week = getWeekNumber(item.work_date, weekStartDate);
    const current = groupedByWeek.get(week) ?? [];
    current.push(item);
    groupedByWeek.set(week, current);
  }

  const weeks = Array.from(groupedByWeek.entries()).sort((a, b) => a[0] - b[0]);
  const weekLabels = new Map(
    weeks.map(([week, weekItems]) => [week, getWeekDateLabel(weekItems)])
  );
  const memberByEmail = new Map(
    members
      .filter((member) => member.email)
      .map((member) => [member.email?.trim().toLowerCase(), member])
  );
  const itemById = new Map(items.map((item) => [item.id, item]));

  function getAbsentReason(item: RoutineItem) {
    const entry = availability.find(
      (availabilityItem) =>
        availabilityItem.team_member_id === item.team_member_id &&
        availabilityItem.unavailable_date === item.work_date &&
        (availabilityItem.capacity_override ?? 0) === 0
    );

    return entry?.reason?.trim() || (entry ? "On leave" : "");
  }

  function getLogMember(log: TimeLog) {
    if (!log.user_email) return null;
    return memberByEmail.get(log.user_email.trim().toLowerCase()) ?? null;
  }

  function getCoverageNames(item: RoutineItem) {
    const names = new Set<string>();

    for (const log of logs) {
      if (!log.routine_item_id) continue;

      const linkedItem = itemById.get(log.routine_item_id);
      const originalRoutineItemId = extractOriginalRoutineItemId(linkedItem?.notes);
      const coversThisItem = log.routine_item_id === item.id || originalRoutineItemId === item.id;

      if (!coversThisItem) continue;

      const logMember = getLogMember(log);
      const logMemberName = logMember?.name ?? log.user_email ?? "Someone";

      if (logMember?.id === item.team_member_id) continue;
      names.add(logMemberName);
    }

    return Array.from(names);
  }

  const clientWeeklyMap = new Map<string, ClientWeekSummary>();

  for (const rule of campaignRules) {
    if (!isTrackedFamily(rule.campaign_type)) continue;

    const key = `${normalizeClientName(rule.client_name)}__${rule.campaign_type}`;
        const current: ClientWeekSummary = clientWeeklyMap.get(key) ?? {
      key,
      clientName: rule.client_name,
      family: rule.campaign_type,
      monthlyTotal: 0,
      week1Target: 0,
      week1Done: 0,
      week2Target: 0,
      week2Done: 0,
      week3Target: 0,
      week3Done: 0,
      week4Target: 0,
      week4Done: 0,
      totalDone: 0,
    };


    current.monthlyTotal += getRuleDeliverableTotal(rule);
    clientWeeklyMap.set(key, current);
  }

  const trackedItems = items.filter(
    (item) =>
      item.client_name !== "Carry-forward" &&
      isTrackedRole(item.role) &&
      isTrackedFamily(item.campaign_type)
  );

    for (const item of trackedItems) {
    if (!isTrackedFamily(item.campaign_type)) continue;

    const family: CampaignFamily = item.campaign_type;
    const key = `${normalizeClientName(item.client_name)}__${family}`;
    const week = getWeekNumber(item.work_date, weekStartDate);

    const current: ClientWeekSummary = clientWeeklyMap.get(key) ?? {
      key,
      clientName: item.client_name,
      family,
      monthlyTotal: 0,
      week1Target: 0,
      week1Done: 0,
      week2Target: 0,
      week2Done: 0,
      week3Target: 0,
      week3Done: 0,
      week4Target: 0,
      week4Done: 0,
      totalDone: 0,
    };

    current.totalDone += item.completed_count;

    if (week === 1) {
      current.week1Target += item.planned_count;
      current.week1Done += item.completed_count;
    } else if (week === 2) {
      current.week2Target += item.planned_count;
      current.week2Done += item.completed_count;
    } else if (week === 3) {
      current.week3Target += item.planned_count;
      current.week3Done += item.completed_count;
    } else {
      current.week4Target += item.planned_count;
      current.week4Done += item.completed_count;
    }

    clientWeeklyMap.set(key, current);
  }


  const clientSummaries = Array.from(clientWeeklyMap.values())
    .filter(
      (item) =>
        item.monthlyTotal > 0 ||
        item.week1Target > 0 ||
        item.week2Target > 0 ||
        item.week3Target > 0 ||
        item.week4Target > 0
    )
    .sort((a, b) => {
      if (a.clientName !== b.clientName) {
        return a.clientName.localeCompare(b.clientName);
      }
      return a.family.localeCompare(b.family);
    });

  return (
    <section className="space-y-6">
      <section className="card rounded-2xl p-4">
        <div className="mb-4">
          <h3 className="font-semibold">Weekly routine tracker</h3>
          <p className="text-sm text-muted">
            Day-wise operational view of the generated plan and completion status.
          </p>
        </div>

        <div className="space-y-6">
          {weeks.map(([week, weekItems]) => {
            const groupedByDate = new Map<string, RoutineItem[]>();

            for (const item of weekItems) {
              const current = groupedByDate.get(item.work_date) ?? [];
              current.push(item);
              groupedByDate.set(item.work_date, current);
            }

            const dates = Array.from(groupedByDate.entries()).sort((a, b) =>
              a[0].localeCompare(b[0])
            );

            return (
              <div
                key={week}
                className="rounded-xl border p-4"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="mb-4">
                  <h4 className="font-medium">
                    Week {week}
                    {weekLabels.get(week) ? (
                      <span className="ml-2 text-sm font-normal text-muted">
                        {weekLabels.get(week)}
                      </span>
                    ) : null}
                  </h4>
                </div>

                <div className="space-y-4">
                  {dates.map(([date, dateItems]) => {
                    const groupedByPod = new Map<string, RoutineItem[]>();

                    for (const item of dateItems) {
                      const current = groupedByPod.get(item.pod) ?? [];
                      current.push(item);
                      groupedByPod.set(item.pod, current);
                    }

                    const pods = Array.from(groupedByPod.entries()).sort((a, b) =>
                      a[0].localeCompare(b[0])
                    );

                    const dateDone = dateItems.reduce(
                      (sum, item) => sum + item.completed_count,
                      0
                    );
                    const datePlanned = dateItems.reduce(
                      (sum, item) => sum + item.planned_count,
                      0
                    );

                    return (
                      <div
                        key={date}
                        className="rounded-xl border p-3"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h5 className="font-medium">{formatDate(date)}</h5>
                          <span className="text-xs text-muted">
                            {dateDone}/{datePlanned}
                          </span>
                        </div>

                        <div className="space-y-4">
                          {pods.map(([pod, podItems]) => {
                            const sortedItems = [...podItems].sort((a, b) => {
                              const aHighlighted = isHighlightedPerson(
                                a,
                                highlightedPersonName
                              );
                              const bHighlighted = isHighlightedPerson(
                                b,
                                highlightedPersonName
                              );

                              if (aHighlighted && !bHighlighted) return -1;
                              if (!aHighlighted && bHighlighted) return 1;

                              if (a.person_name !== b.person_name) {
                                return a.person_name.localeCompare(b.person_name);
                              }

                              return a.client_name.localeCompare(b.client_name);
                            });

                            const podDone = sortedItems.reduce(
                              (sum, item) => sum + item.completed_count,
                              0
                            );
                            const podPlanned = sortedItems.reduce(
                              (sum, item) => sum + item.planned_count,
                              0
                            );

                            return (
                              <div
                                key={`${date}-${pod}`}
                                className="rounded-lg border p-3"
                                style={{ borderColor: "var(--border)" }}
                              >
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <h6 className="font-medium">{pod}</h6>
                                  <span className="text-xs text-muted">
                                    {podDone}/{podPlanned}
                                  </span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full min-w-[900px] text-left text-sm">
                                    <thead style={{ background: "var(--surface-soft)" }}>
                                      <tr>
                                        <th className="px-3 py-2">Person</th>
                                        <th className="px-3 py-2">Client</th>
                                        <th className="px-3 py-2">Campaign</th>
                                        <th className="px-3 py-2">Output</th>
                                        <th className="px-3 py-2">Planned</th>
                                        <th className="px-3 py-2">Completed</th>
                                        <th className="px-3 py-2">Status</th>
                                        <th className="px-3 py-2">Notes</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {sortedItems.map((item) => {
                                        const isHighlighted = isHighlightedPerson(
                                          item,
                                          highlightedPersonName
                                        );
                                        const absentReason = getAbsentReason(item);
                                        const coverageNames = getCoverageNames(item);

                                        return (
                                          <tr
                                            key={item.id}
                                            className="border-t"
                                            style={{
                                              borderColor: "var(--border)",
                                              background: absentReason
                                                ? "var(--warning-soft)"
                                                : isHighlighted
                                                ? "color-mix(in srgb, var(--primary-glow) 45%, transparent)"
                                                : "transparent",
                                            }}
                                          >
                                            <td className="px-3 py-2">
                                              <div
                                                style={{
                                                  fontWeight: isHighlighted ? 800 : 600,
                                                  color: isHighlighted
                                                    ? "var(--primary)"
                                                    : "var(--foreground)",
                                                }}
                                              >
                                                {item.person_name}
                                              </div>
                                              <div
                                                className="text-xs"
                                                style={{
                                                  color: isHighlighted
                                                    ? "var(--primary)"
                                                    : "var(--muted)",
                                                  fontWeight: isHighlighted ? 600 : 400,
                                                }}
                                              >
                                                {item.role} · {item.pod}
                                              </div>
                                              {absentReason ? (
                                                <div
                                                  className="mt-1 text-xs"
                                                  style={{ color: "var(--warning)", fontWeight: 700 }}
                                                >
                                                  Absent: {absentReason}
                                                </div>
                                              ) : null}
                                            </td>
                                            <td className="px-3 py-2">
                                              {item.client_name === "Carry-forward"
                                                ? "Backlog"
                                                : item.client_name}
                                            </td>
                                            <td className="px-3 py-2">
                                              {item.client_name === "Carry-forward"
                                                ? "-"
                                                : item.campaign_type}
                                            </td>
                                            <td className="px-3 py-2">{item.output_type}</td>
                                            <td className="px-3 py-2">{item.planned_count}</td>
                                            <td className="px-3 py-2">{item.completed_count}</td>
                                            <td className="px-3 py-2">{getStatus(item)}</td>
                                            <td className="px-3 py-2">
                                              <div>{item.notes ?? "-"}</div>
                                              {coverageNames.length > 0 ? (
                                                <div
                                                  className="mt-1 text-xs"
                                                  style={{ color: "var(--success)", fontWeight: 700 }}
                                                >
                                                  Covered by {coverageNames.join(", ")}
                                                </div>
                                              ) : null}
                                            </td>
                                          </tr>
                                        );
                                      })}

                                      {sortedItems.length === 0 && (
                                        <tr>
                                          <td className="px-3 py-4 text-muted" colSpan={8}>
                                            No routine items for this pod.
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card rounded-2xl p-4">
        <div className="mb-4">
          <h3 className="font-semibold">Client weekly tracker</h3>
          <p className="text-sm text-muted">
            Weekly client deliverables based on designer and editor output only.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left text-sm">
            <thead style={{ background: "var(--surface-soft)" }}>
              <tr>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Family</th>
                <th className="px-3 py-2">Monthly total</th>
                <th className="px-3 py-2">Total done</th>
                <th className="px-3 py-2">Progress</th>
                <th className="px-3 py-2">
                  <div>Week 1</div>
                  {weekLabels.get(1) ? (
                    <div className="text-xs font-normal normal-case text-muted">
                      {weekLabels.get(1)}
                    </div>
                  ) : null}
                </th>
                <th className="px-3 py-2">
                  <div>Week 2</div>
                  {weekLabels.get(2) ? (
                    <div className="text-xs font-normal normal-case text-muted">
                      {weekLabels.get(2)}
                    </div>
                  ) : null}
                </th>
                <th className="px-3 py-2">
                  <div>Week 3</div>
                  {weekLabels.get(3) ? (
                    <div className="text-xs font-normal normal-case text-muted">
                      {weekLabels.get(3)}
                    </div>
                  ) : null}
                </th>
                <th className="px-3 py-2">
                  <div>Week 4/5</div>
                  {weekLabels.get(4) || weekLabels.get(5) ? (
                    <div className="text-xs font-normal normal-case text-muted">
                      {[weekLabels.get(4), weekLabels.get(5)].filter(Boolean).join(" + ")}
                    </div>
                  ) : null}
                </th>
              </tr>
            </thead>
            <tbody>
              {clientSummaries.map((summary) => {
                const checkpoint1 = getPercent(summary.week1Target, summary.monthlyTotal);
                const checkpoint2 = getPercent(
                  summary.week1Target + summary.week2Target,
                  summary.monthlyTotal
                );
                const checkpoint3 = getPercent(
                  summary.week1Target + summary.week2Target + summary.week3Target,
                  summary.monthlyTotal
                );
                const overallPercent = getPercent(summary.totalDone, summary.monthlyTotal);

                return (
                  <tr
                    key={summary.key}
                    className="border-t"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-3 py-2 font-medium">{summary.clientName}</td>
                    <td className="px-3 py-2">{getFamilyLabel(summary.family)}</td>
                    <td className="px-3 py-2">{summary.monthlyTotal}</td>
                    <td className="px-3 py-2">{summary.totalDone}</td>
                    <td className="px-3 py-2">
                      <div className="min-w-[220px]">
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <span>
                            {summary.totalDone}/{summary.monthlyTotal}
                          </span>
                          <span className="text-xs text-muted">{overallPercent}%</span>
                        </div>
                        <div
                          className="relative h-2 overflow-hidden rounded-full"
                          style={{ background: "var(--surface-soft)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${overallPercent}%`,
                              background: "var(--primary)",
                            }}
                          />
                          <div
                            className="absolute inset-y-0 w-[2px]"
                            style={{ left: `${checkpoint1}%`, background: "var(--warning)" }}
                          />
                          <div
                            className="absolute inset-y-0 w-[2px]"
                            style={{ left: `${checkpoint2}%`, background: "var(--warning)" }}
                          />
                          <div
                            className="absolute inset-y-0 w-[2px]"
                            style={{ left: `${checkpoint3}%`, background: "var(--warning)" }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {summary.week1Done}/{summary.week1Target}
                    </td>
                    <td className="px-3 py-2">
                      {summary.week2Done}/{summary.week2Target}
                    </td>
                    <td className="px-3 py-2">
                      {summary.week3Done}/{summary.week3Target}
                    </td>
                    <td className="px-3 py-2">
                      {summary.week4Done}/{summary.week4Target}
                    </td>
                  </tr>
                );
              })}

              {clientSummaries.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-muted" colSpan={9}>
                    No client weekly deliverable data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
