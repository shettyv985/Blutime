"use client";

import { useEffect, useMemo, useState } from "react";

type SheetName = "LEGEND & RULES" | keyof typeof pods;
type DayType = "full" | "half" | "off" | "buffer";
type RoleName = "Writer" | "Production" | "Designer" | "Editor";

type PodClient = readonly [
  client: string,
  service: string,
  writer: string,
  designer: string,
  editor: string,
  videos: number,
  statics: number,
  note: string,
];

type PodData = {
  shoot_days: Record<string, "full" | "half">;
  capacity: Record<string, string>;
  clients: readonly PodClient[];
  flags: readonly string[];
};

type WeekDay = {
  dateKey: string;
  label: string;
  type: DayType;
};

type WeekBlock = {
  key: string;
  name: string;
  days: WeekDay[];
  isBuffer: boolean;
};

type RoleRow = {
  client: string;
  service: string;
  role: RoleName;
  person: string;
  tasks: Record<string, string>;
  weeklyOut: number;
  note: string;
  bg: string;
  border: string;
  isFirst: boolean;
};

type ProductionAllocation = {
  allocations: Record<string, Record<string, number>>;
  remaining: Record<string, number>;
};

type DesignerAllocation = {
  allocations: Record<string, Record<string, Record<string, number>>>;
  remaining: Record<string, number>;
};

type WriterTaskCounts = {
  briefs: number;
  scripts: number;
};

type WriterAllocation = {
  allocations: Record<string, Record<string, Record<string, WriterTaskCounts>>>;
  remaining: Record<string, number>;
};

type ProductionPlanClient = {
  client: PodClient;
  carryover: number;
  remaining: number;
  total: number;
};

type DesignerPlanClient = {
  client: PodClient;
  designers: string[];
  podName: PodName;
  carryover: number;
  remaining: number;
  total: number;
};

export type PodName = keyof typeof pods;

export type WorkbookClientDraft = {
  id: string;
  clientId: string | null;
  sourceClientName: string | null;
  client: string;
  podName: PodName;
  service: "PM" | "SM" | "PM+SM";
  videos: number;
  statics: number;
  writerIds: string[];
  writerNames: string[];
  designerIds: string[];
  designerNames: string[];
  editorIds: string[];
  editorNames: string[];
};

export type WorkbookPods = Record<PodName, PodData>;

type WorkbookUser = {
  id: string;
  name: string;
  departmentName: string | null;
};

export type SavedProductionWorkbookPlan = {
  id: string;
  clientId: string;
  clientName: string;
  podName: PodName;
  service: WorkbookClientDraft["service"];
  videos: number;
  statics: number;
  writerIds: string[];
  writerNames: string[];
  designerIds: string[];
  designerNames: string[];
  editorIds: string[];
  editorNames: string[];
};

type WorkbookApiPayload = {
  error?: string;
  plans?: SavedProductionWorkbookPlan[];
  clients?: Array<{ id: string; name: string }>;
  teamMembers?: Array<{
    clientId: string;
    userId: string;
    teamRole: "writer" | "designer" | "editor";
    userName: string;
  }>;
  users?: WorkbookUser[];
};

export type EmployeePlannerItem = {
  client: string;
  dateLabel: string;
  dueSoon: boolean;
  order: number;
  podName: PodName;
  role: RoleName;
  service: string;
  task: string;
  weekName: string;
};

type BufferRow = {
  client: string;
  service: string;
  condition: string;
  action: string;
  who: string;
  output: string;
};

type OutputSummaryRow = {
  client: string;
  service: string;
  plannedVideos: number;
  plannedStatics: number;
  requiredVideos: number;
  requiredStatics: number;
  remainingVideos: number;
  remainingStatics: number;
  remainingWriterTasks: number;
};

type XmlCell = {
  value?: string;
  style?: string;
  mergeAcross?: number;
};

type XmlRow = {
  cells: XmlCell[];
  height?: number;
};

const C = {
  header_bg: "1F2D3D",
  header_fg: "FFFFFF",
  week_bg: "2C5F8A",
  week_fg: "FFFFFF",
  date_bg: "D9E8F5",
  date_fg: "1F2D3D",
  writer: "EDE7F6",
  writer_b: "7E57C2",
  designer: "FFF8E1",
  designer_b: "F9A825",
  editor: "E8F5E9",
  editor_b: "388E3C",
  production: "FCE4EC",
  production_b: "C62828",
  buffer: "F3E5F5",
  buffer_b: "7B1FA2",
  offday: "EEEEEE",
  offday_fg: "9E9E9E",
  warning: "FF5252",
  warning_fg: "FFFFFF",
  flag: "FF6D00",
  w4: "E8EAF6",
  subhdr: "37474F",
  subhdr_fg: "FFFFFF",
  min_out: "F1F8E9",
};

const pods = {
  ROBISH: {
    shoot_days: { Tue: "full", Fri: "half" },
    capacity: {
      Writers: "Durga, Fathima, Naveen — max 6 tasks/full day each, 3/half day",
      Designers: "Shwetha, Akhil — max 6 design tasks/full day each, 3/half day",
      Editor: "Adithyan — 3 videos/day",
    },
    clients: [
      ["Abad", "PM+SM", "Durga/Fathima", "Shwetha", "Adithyan", 15, 12, "SM: +3 branding vids"],
      ["Activbase", "PM", "Fathima", "Akhil", "Adithyan", 5, 10, "cross-pod writer"],
      ["Kia", "PM+SM", "Naveen", "Akhil", "Adithyan", 12, 10, "SM: +4 statics +4 branding vids"],
      ["Mother's Food", "PM", "Naveen/Durga", "Shwetha", "Adithyan", 5, 10, ""],
      ["Memory Train", "PM", "Naveen", "Akhil", "Adithyan", 5, 10, "no shoot - client footage / old clips"],
      ["Pawan", "PM+SM", "Naveen", "Akhil", "Adithyan", 12, 10, "SM: +10 statics +5 branding vids"],
      ["Heal in Kerala", "PM", "Fathima", "Shwetha", "Adithyan", 12, 10, "cross-pod writer"],
    ],
    flags: [
      "⚠️ Naveen handles Kia, Mother's Food, Memory Train, Pawan — 4 clients. Monitor weekly load carefully.",
      "⚠️ Friday shoot shared with Reshma pod — max 2–3 reels total, split equally (~1–2 each pod).",
      "ℹ️ Memory Train: client footage / old clips — Writer → Editor direct, no production shoot needed.",
    ],
  },
  RELSA: {
    shoot_days: { Wed: "full", Thu: "full" },
    capacity: {
      Writers: "Rohith, Aswathy, Aswathy Manoj, Alphin, Fathima — max 6 tasks/full day each, 3/half day",
      Designers: "Anandu KR, Lekshmi — max 6 design tasks/full day each, 3/half day",
      Editors: "Bibin, Jabin — 3 videos/day each",
    },
    clients: [
      ["Chakolas", "PM+SM", "Rohith (cross)", "Anandu KR (cross)", "Bibin", 15, 12, "no shoot - client footage / old clips. SM: +3 branding vids"],
      ["Kulud", "PM", "Rohith (cross)", "Lekshmi", "—", 0, 15, "statics only"],
      ["Ekabrahmaa", "PM+SM", "Aswathy/Fathima", "Lekshmi", "Bibin", 12, 10, "SM: +4 statics +4 branding vids"],
      ["Blusteak", "SM", "Rohith (cross)", "—", "Bibin/Jabin", 5, 0, "AI video — no shoot needed"],
      ["Geojit", "SM", "Aswathy Manoj", "Anandu KR (cross)", "Bibin", 5, 10, ""],
      ["Blucampus", "PM", "Alphin (cross)", "—", "Bibin/Jabin", 12, 0, "AI video — writer→editor 2 days"],
      ["Angel Homes", "SM", "Aswathy Manoj", "Lekshmi/Anandu KR", "Bibin", 9, 9, "9 statics/carousels"],
    ],
    flags: [
      "✅ Relsa has 2 full shoot days (Wed+Thu) — strongest shoot capacity of all pods.",
      "⚠️ Rohith is cross-pod — also appears in Reshma. Monitor total load.",
      "ℹ️ AI/no-shoot videos (Chakolas, Blusteak, Blucampus): Writer→Editor direct, no production shoot needed.",
    ],
  },
  RESHMA: {
    shoot_days: { Mon: "full", Fri: "half" },
    capacity: {
      Writers: "Durga, Alphin, Rohith (all cross-pod) — max 6 tasks/full day each, 3/half day",
      Designers: "Anandhu Shaji, Abhijith MS, Anandu KR (cross) — max 6 design tasks/full day each, 3/half day",
      Editors: "Jabin, Anu Rose — 3 videos/day each",
    },
    clients: [
      ["Zeiq", "PM+SM", "Durga (cross)", "Anandhu Shaji", "Jabin/Anu Rose", 15, 12, "SM: +3 branding vids"],
      ["Halwa", "PM+SM", "Alphin (cross)", "Abhijith MS", "Jabin/Anu Rose", 15, 10, "SM: +5 branding vids"],
      ["Spaces Eco", "PM+SM", "Durga (cross)/Alphin (cross)", "Abhijith MS", "Jabin/Anu Rose", 15, 10, "SM: +5 branding vids"],
      ["CNC", "PM", "Rohith (cross)", "Abhijith MS", "Jabin", 5, 30, "Heavy static load — 30/month"],
      ["Lexus", "PM+SM", "Rohith (cross)", "Abhijith MS", "Anu Rose", 12, 10, "SM: +10 statics +5 branding vids"],
      ["DK Healthcare", "SM", "Rohith (cross)", "Anandu KR (cross)", "—", 0, 12, "statics only, no editor"],
      ["DKG", "SM", "—", "Anandu KR (cross)", "—", 0, 12, "no writer, designer direct"],
      ["Guideup", "PM", "TBD", "TBD", "TBD", 0, 0, "3-month temp — TBD"],
    ],
    flags: [
      "⚠️ HEAVY: Zeiq+Halwa+Spaces Eco all have 15 videos/month = 45 videos across 3 clients.",
      "⚠️ Friday shoot shared with Robish — 2–3 reels total split equally. Reshma must rely heavily on Monday shoot.",
      "⚠️ Monday shoot: prioritise by rotation — Week1: Zeiq, Week2: Halwa, Week3: Spaces Eco.",
      "⚠️ CNC has 30 statics — heaviest static load. Spread 10/week across Abhijith MS.",
      "⚠️ Durga, Alphin, Rohith are ALL cross-pod. Verify total cross-pod task count weekly.",
    ],
  },
} satisfies Record<string, PodData>;

const sheetNames: SheetName[] = ["LEGEND & RULES", "ROBISH", "RELSA", "RESHMA"];
const podNames = Object.keys(pods) as PodName[];

const legendRows: Array<[string, string | null]> = [
  ["LEGEND & WORKFLOW RULES", null],
  ["", null],
  ["COLOUR CODES", null],
  ["Writer (purple)", C.writer],
  ["Designer (amber)", C.designer],
  ["Editor (green)", C.editor],
  ["Production/Shoot (red)", C.production],
  ["Buffer W4 (lilac)", C.buffer],
  ["Off day (grey)", C.offday],
  ["Half day (orange tint)", "FFE0B2"],
  ["", null],
  ["WORKFLOW RULES", null],
  ["Static flow", "Writer writes brief (Day 1) → Designer designs (Day 2)"],
  ["Reel flow", "Writer scripts (Day 1) → Shoot/Production (Day 2) → Editor edits (Day 3)"],
  ["AI / no-shoot video flow", "Writer scripts (Day 1) → Editor edits provided footage / AI (Day 2, Day 3 only if needed)"],
  ["Priority client approval", "Same day — flow continues next day"],
  ["Normal client approval", "1 day buffer built into flow"],
  ["", null],
  ["PRODUCTION CAPACITY", null],
  ["Full shoot day", "4–5 reels max"],
  ["Half shoot day (Fri / odd Sat)", "2–3 reels max"],
  ["Friday shared (Robish + Reshma)", "2–3 reels total split equally ~1–2 reels each pod"],
  ["", null],
  ["TEAM CAPACITY", null],
  ["Writers", "Maximum 6 tasks per full day | 3 on half days | spread fairly across pending clients"],
  ["Designers", "Maximum 6 design tasks per full day | 3 on half days | shared across all clients and pods"],
  ["Editors", "3 videos/day per editor"],
  ["", null],
  ["W4 BUFFER RULE", null],
  ["PM client hit target", "W4 = rest, review, next-month planning"],
  ["PM client missed target", "W4 = keep producing videos + statics until target hit"],
  ["Social client", "W4 = additional creatives if engagement target missed"],
  ["", null],
  ["MINIMUM OUTPUT RULE", null],
  ["Every client, every week", "Minimum 1–2 final delivered creatives (video OR static) must go out"],
  ["", null],
  ["SATURDAY RULE", null],
  ["Odd Saturdays", "Work — half day (3 hrs)"],
  ["Even Saturdays", "OFF"],
  ["Sundays", "Always OFF"],
  ["", null],
  ["CROSS-POD WRITERS — WATCH LIST", null],
  ["Fathima", "Robish (Activbase, Heal in Kerala) + Relsa (Ekabrahmaa shared)"],
  ["Rohith", "Relsa (Chakolas, Kulud, Blusteak) + Reshma (CNC, Lexus, DK Healthcare)"],
  ["Durga", "Robish (Abad shared) + Reshma (Zeiq)"],
  ["Alphin", "Relsa (Blucampus) + Reshma (Halwa, Spaces Eco)"],
  ["Anandu KR", "Relsa (Chakolas, Geojit, Angel Homes cross) + Reshma (DK Healthcare, DKG cross)"],
];

function split3(n: number) {
  const base = Math.floor(n / 3);
  const r = n % 3;
  return [base + (r > 0 ? 1 : 0), base + (r > 1 ? 1 : 0), base];
}

function isMissingPerson(value: string) {
  return value === "—" || value === "TBD" || value === "Unassigned";
}

function assignedPeople(value: string) {
  return value
    .split(/[\/,]/)
    .map((person) => person.replace(/\([^)]*\)/g, "").trim())
    .filter((person) => person && !isMissingPerson(person));
}

function createWorkbookClientDraft(id = "client-1"): WorkbookClientDraft {
  return {
    id,
    clientId: null,
    sourceClientName: null,
    client: "",
    podName: "ROBISH",
    service: "PM",
    videos: 0,
    statics: 0,
    writerIds: [],
    writerNames: [],
    designerIds: [],
    designerNames: [],
    editorIds: [],
    editorNames: [],
  };
}

function workbookService(value: string): WorkbookClientDraft["service"] {
  if (value === "SM" || value === "PM+SM") return value;
  return "PM";
}

function createCurrentWorkbookClientDrafts(): WorkbookClientDraft[] {
  return podNames.flatMap((podName) =>
    pods[podName].clients.map(([client, service, writer, designer, editor, videos, statics], index) => ({
      id: `current-${podName}-${index}`,
      clientId: null,
      sourceClientName: client,
      client,
      podName,
      service: workbookService(service),
      videos,
      statics,
      writerIds: [],
      writerNames: assignedPeople(writer),
      designerIds: [],
      designerNames: assignedPeople(designer),
      editorIds: [],
      editorNames: assignedPeople(editor),
    }))
  );
}

function workbookDraftsFromPayload(payload: WorkbookApiPayload): WorkbookClientDraft[] {
  if (payload.plans && payload.plans.length > 0) {
    return payload.plans.map((plan) => ({
      id: plan.id,
      clientId: plan.clientId,
      sourceClientName: plan.clientName,
      client: plan.clientName,
      podName: plan.podName,
      service: plan.service,
      videos: plan.videos,
      statics: plan.statics,
      writerIds: plan.writerIds,
      writerNames: plan.writerNames,
      designerIds: plan.designerIds,
      designerNames: plan.designerNames,
      editorIds: plan.editorIds,
      editorNames: plan.editorNames,
    }));
  }

  const usersByName = new Map((payload.users ?? []).map((user) => [normalizedClientName(user.name), user]));
  const clientsByName = new Map((payload.clients ?? []).map((client) => [normalizedClientName(client.name), client]));

  return createCurrentWorkbookClientDrafts().map((draft) => {
    const client = clientsByName.get(normalizedClientName(draft.client));
    const teamMembers = (payload.teamMembers ?? []).filter((member) => member.clientId === client?.id);

    function roleSelection(role: "writer" | "designer" | "editor", fallbackNames: string[]) {
      const saved = teamMembers.filter((member) => member.teamRole === role);
      if (saved.length > 0) {
        return {
          ids: saved.map((member) => member.userId),
          names: saved.map((member) => member.userName),
        };
      }

      const matchedUsers = fallbackNames
        .map((name) => usersByName.get(normalizedClientName(name)))
        .filter((user): user is WorkbookUser => Boolean(user));
      return {
        ids: matchedUsers.map((user) => user.id),
        names: fallbackNames,
      };
    }

    const writers = roleSelection("writer", draft.writerNames);
    const designers = roleSelection("designer", draft.designerNames);
    const editors = roleSelection("editor", draft.editorNames);

    return {
      ...draft,
      clientId: client?.id ?? null,
      writerIds: writers.ids,
      writerNames: writers.names,
      designerIds: designers.ids,
      designerNames: designers.names,
      editorIds: editors.ids,
      editorNames: editors.names,
    };
  });
}

function normalizedClientName(value: string) {
  return value.trim().toLocaleLowerCase();
}

function findExistingPodClient(clientName: string) {
  const normalizedName = normalizedClientName(clientName);

  for (const podData of Object.values(pods)) {
    const client = podData.clients.find(([name]) => normalizedClientName(name) === normalizedName);
    if (client) return client;
  }

  return null;
}

function uniquePeople(clients: readonly PodClient[], roleIndex: 2 | 3 | 4) {
  return [...new Set(clients.flatMap((client) => assignedPeople(client[roleIndex])))].sort((left, right) =>
    left.localeCompare(right)
  );
}

function applyDynamicPodMetadata(workbookPods: WorkbookPods): WorkbookPods {
  const personPods = new Map<string, Set<PodName>>();

  for (const podName of podNames) {
    for (const client of workbookPods[podName].clients) {
      for (const roleIndex of [2, 3, 4] as const) {
        for (const person of assignedPeople(client[roleIndex])) {
          const key = normalizedClientName(person);
          const assignedPods = personPods.get(key) ?? new Set<PodName>();
          assignedPods.add(podName);
          personPods.set(key, assignedPods);
        }
      }
    }
  }

  return Object.fromEntries(
    podNames.map((podName) => {
      const podData = workbookPods[podName];
      const writers = uniquePeople(podData.clients, 2);
      const designers = uniquePeople(podData.clients, 3);
      const editors = uniquePeople(podData.clients, 4);
      const flags: string[] = [];
      const totalVideos = podData.clients.reduce((total, client) => total + client[5], 0);

      if (podName === "RELSA") {
        flags.push("✅ Two full shoot days give this pod the strongest weekly shoot capacity.");
      }
      if (podName === "ROBISH") {
        flags.push("⚠️ Friday shoot capacity is shared with Reshma; the generator limits the combined workload.");
      }
      if (podName === "RESHMA") {
        flags.push("⚠️ Friday shoot capacity is shared with Robish; prioritise Monday for the heavier video clients.");
      }
      if (totalVideos >= 35) {
        flags.push(`⚠️ HEAVY VIDEO LOAD: ${totalVideos} videos are planned across ${podData.clients.length} clients.`);
      }

      for (const [roleLabel, roleIndex] of [["Writer", 2], ["Designer", 3], ["Editor", 4]] as const) {
        const clientCounts = new Map<string, { name: string; count: number }>();
        for (const client of podData.clients) {
          for (const person of assignedPeople(client[roleIndex])) {
            const key = normalizedClientName(person);
            const current = clientCounts.get(key) ?? { name: person, count: 0 };
            current.count += 1;
            clientCounts.set(key, current);
          }
        }
        for (const { name, count } of clientCounts.values()) {
          if (count >= 4) flags.push(`⚠️ ${roleLabel} ${name} is assigned to ${count} clients in this pod.`);
          if ((personPods.get(normalizedClientName(name))?.size ?? 0) > 1) {
            flags.push(`⚠️ ${name} is cross-pod; capacity is shared across every assigned pod.`);
          }
        }
      }

      const noShootClients = podData.clients
        .filter((client) => isDirectEditVideo(client[7]))
        .map((client) => client[0]);
      if (noShootClients.length > 0) {
        flags.push(`ℹ️ No-shoot/direct-edit clients: ${noShootClients.join(", ")}.`);
      }

      const missingTeam = podData.clients
        .filter((client) => isMissingPerson(client[2]) || isMissingPerson(client[3]) || (client[5] > 0 && isMissingPerson(client[4])))
        .map((client) => client[0]);
      if (missingTeam.length > 0) {
        flags.push(`⚠️ Team assignment incomplete: ${missingTeam.join(", ")}.`);
      }

      return [
        podName,
        {
          ...podData,
          capacity: {
            Writers: `${writers.join(", ") || "Unassigned"} — max 6 tasks/full day each, 3/half day`,
            Designers: `${designers.join(", ") || "Unassigned"} — max 6 design tasks/full day each, 3/half day`,
            Editors: `${editors.join(", ") || "Unassigned"} — max 3 videos/day each`,
          },
          flags: [...new Set(flags)],
        },
      ];
    })
  ) as unknown as WorkbookPods;
}

export function buildWorkbookPods(drafts: WorkbookClientDraft[]): WorkbookPods {
  const clientsByPod = new Map<PodName, PodClient[]>(podNames.map((podName) => [podName, []]));

  for (const draft of drafts) {
    const clientName = draft.client.trim();
    if (!clientName) continue;

    const existingClient = findExistingPodClient(draft.sourceClientName ?? clientName);
    const workbookClient: PodClient = [
      clientName,
      draft.service,
      draft.writerNames?.join("/") || existingClient?.[2] || "Unassigned",
      draft.designerNames?.join("/") || existingClient?.[3] || "Unassigned",
      draft.editorNames?.join("/") || existingClient?.[4] || "Unassigned",
      Math.max(0, Math.floor(draft.videos)),
      Math.max(0, Math.floor(draft.statics)),
      existingClient?.[7] ?? "Team assignment required",
    ];

    clientsByPod.get(draft.podName)?.push(workbookClient);
  }

  const workbookPods: WorkbookPods = {
    ROBISH: { ...pods.ROBISH, clients: clientsByPod.get("ROBISH") ?? [] },
    RELSA: { ...pods.RELSA, clients: clientsByPod.get("RELSA") ?? [] },
    RESHMA: { ...pods.RESHMA, clients: clientsByPod.get("RESHMA") ?? [] },
  };

  return applyDynamicPodMetadata(workbookPods);
}

export function buildWorkbookPodsFromSavedPlans(plans: SavedProductionWorkbookPlan[]) {
  return buildWorkbookPods(
    plans.map((plan) => ({
      id: plan.id,
      clientId: plan.clientId,
      sourceClientName: plan.clientName,
      client: plan.clientName,
      podName: plan.podName,
      service: plan.service,
      videos: plan.videos,
      statics: plan.statics,
      writerIds: plan.writerIds,
      writerNames: plan.writerNames,
      designerIds: plan.designerIds,
      designerNames: plan.designerNames,
      editorIds: plan.editorIds,
      editorNames: plan.editorNames,
    }))
  );
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatMonthShort(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return "";
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "short" });
}

function dayLabel(date: Date) {
  return `${date.toLocaleDateString(undefined, { weekday: "short" })} ${date.getDate()} ${date.toLocaleDateString(undefined, { month: "short" })}`;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isDueSoon(dateValue: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(`${dateValue}T00:00:00`).getTime();
  const threeDays = 3 * 24 * 60 * 60 * 1000;

  return target >= today && target <= today + threeDays;
}

function buildWeeks(monthKey: string): WeekBlock[] {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return [];

  const lastDay = new Date(year, month, 0).getDate();
  const monthShort = formatMonthShort(monthKey);
  const weeks: WeekBlock[] = [];
  let saturdayCount = 0;
  const dayTypes = new Map<number, DayType>();

  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;
    if (isSaturday) saturdayCount += 1;

    dayTypes.set(day, isSunday || (isSaturday && saturdayCount % 2 === 0) ? "off" : isSaturday ? "half" : "full");
  }

  const ranges = [
    [1, Math.min(7, lastDay)],
    [8, Math.min(14, lastDay)],
    [15, Math.min(21, lastDay)],
    [22, lastDay],
  ].filter(([start]) => start <= lastDay);

  for (const [index, [start, end]] of ranges.entries()) {
    const isBuffer = index === 3;
    const days: WeekDay[] = [];

    for (let day = start; day <= end; day += 1) {
      const date = new Date(year, month - 1, day);
      if (date.getDay() === 0) continue;
      const baseType = dayTypes.get(day) ?? "full";
      days.push({
        dateKey: dateKey(date),
        label: dayLabel(date),
        type: isBuffer && baseType !== "off" ? "buffer" : baseType,
      });
    }

    const first = days[0]?.label.split(" ").slice(1).join(" ") ?? `${start} ${monthShort}`;
    const last = days.at(-1)?.label.split(" ").slice(1).join(" ") ?? `${end} ${monthShort}`;

    weeks.push({
      key: `W${index + 1}`,
      name: `W${index + 1} (${first}–${last})${isBuffer ? " — BUFFER" : ""}`,
      days,
      isBuffer,
    });
  }

  return weeks;
}

function roleColors(role: RoleName) {
  if (role === "Writer") return { bg: C.writer, border: C.writer_b };
  if (role === "Production") return { bg: C.production, border: C.production_b };
  if (role === "Designer") return { bg: C.designer, border: C.designer_b };
  return { bg: C.editor, border: C.editor_b };
}

function shootDayKey(podData: PodData, day: WeekDay) {
  return Object.keys(podData.shoot_days).find((shootDay) => day.label.startsWith(shootDay));
}

function shootCapacity(podData: PodData, day: WeekDay) {
  const dayKey = shootDayKey(podData, day);
  if (!dayKey) return 0;
  const shootType = podData.shoot_days[dayKey];
  if (shootType === "full") return 5;
  if (shootType === "half") return 3;
  return 0;
}

function shootDaysForWeek(podData: PodData, week: WeekBlock) {
  return week.days.filter(
    (day) =>
      day.type !== "off" &&
      Object.keys(podData.shoot_days).some((shootDay) => day.label.includes(shootDay))
  );
}

function isDirectEditVideo(note: string) {
  const normalized = note.toLowerCase();
  return (
    /\bai\b/i.test(note) ||
    normalized.includes("no shoot") ||
    normalized.includes("existing footage") ||
    normalized.includes("client footage") ||
    normalized.includes("old clip")
  );
}

function weeklyVideoNeed(client: PodClient, weekIndex: number) {
  const [, , , , , vids, , note] = client;
  if (vids <= 0 || isDirectEditVideo(note)) return 0;
  return split3(vids)[weekIndex] ?? 0;
}

function emptyProductionAllocation(podData: PodData): ProductionAllocation {
  const allocation: ProductionAllocation = { allocations: {}, remaining: {} };

  for (const client of podData.clients) {
    const clientName = client[0];
    allocation.allocations[clientName] = {};
    allocation.remaining[clientName] = 0;
  }

  return allocation;
}

function hasProductionAllocation(allocation: ProductionAllocation) {
  return (
    Object.values(allocation.allocations).some((tasks) => Object.values(tasks).some((count) => count > 0)) ||
    Object.values(allocation.remaining).some((count) => count > 0)
  );
}

function buildMonthProductionAllocations(podData: PodData, weeks: WeekBlock[]): ProductionAllocation[] {
  const monthAllocations = weeks.map(() => emptyProductionAllocation(podData));
  const videoClients: ProductionPlanClient[] = podData.clients
    .filter((client) => weeklyVideoNeed(client, 0) + weeklyVideoNeed(client, 1) + weeklyVideoNeed(client, 2) > 0)
    .map((client) => ({
      client,
      carryover: 0,
      remaining: client[5],
      total: client[5],
    }));

  for (const [weekIndex, week] of weeks.entries()) {
    const weekAllocation = monthAllocations[weekIndex];
    const isFinalWeek = weekIndex === weeks.length - 1 || week.isBuffer;
    const activeClients = videoClients
      .map((item) => {
        const plannedThisWeek = isFinalWeek ? item.remaining : Math.min(item.remaining, (split3(item.total)[weekIndex] ?? 0) + item.carryover);

        return { item, plannedThisWeek };
      })
      .filter(({ plannedThisWeek }) => plannedThisWeek > 0);

    if (activeClients.length === 0) continue;

    const targetRemaining = Object.fromEntries(
      activeClients.map(({ item, plannedThisWeek }) => [item.client[0], plannedThisWeek])
    ) as Record<string, number>;
    const rotation = weekIndex % activeClients.length;
    const rotatedClients = activeClients.slice(rotation).concat(activeClients.slice(0, rotation));
    let cursor = 0;

    for (const day of shootDaysForWeek(podData, week)) {
      let capacity = shootCapacity(podData, day);

      while (capacity > 0 && rotatedClients.some(({ item }) => (targetRemaining[item.client[0]] ?? 0) > 0)) {
        let assigned = false;

        for (let offset = 0; offset < rotatedClients.length; offset += 1) {
          const index = (cursor + offset) % rotatedClients.length;
          const clientName = rotatedClients[index].item.client[0];

          if ((targetRemaining[clientName] ?? 0) <= 0) continue;

          weekAllocation.allocations[clientName][day.label] = (weekAllocation.allocations[clientName][day.label] ?? 0) + 1;
          targetRemaining[clientName] -= 1;
          capacity -= 1;
          cursor = (index + 1) % rotatedClients.length;
          assigned = true;
          break;
        }

        if (!assigned) break;
      }
    }

    for (const { item, plannedThisWeek } of activeClients) {
      const clientName = item.client[0];
      const allocatedThisWeek = sumTaskCounts(weekAllocation.allocations[clientName] ?? {});
      item.remaining = Math.max(item.remaining - allocatedThisWeek, 0);
      item.carryover = isFinalWeek ? 0 : Math.max(plannedThisWeek - allocatedThisWeek, 0);
    }

    if (isFinalWeek) {
      for (const item of videoClients) {
        weekAllocation.remaining[item.client[0]] = item.remaining;
      }
    }
  }

  return monthAllocations;
}

function buildProductionAllocation(podData: PodData, weeks: WeekBlock[], weekIndex: number): ProductionAllocation {
  return buildMonthProductionAllocations(podData, weeks)[weekIndex] ?? emptyProductionAllocation(podData);
}

function nextEditableDayLabel(week: WeekBlock, shootDayLabel: string) {
  const shootIndex = week.days.findIndex((day) => day.label === shootDayLabel);
  const nextDay = week.days.slice(Math.max(0, shootIndex + 1)).find((day) => day.type !== "off");
  return nextDay?.label ?? week.days[Math.max(0, shootIndex)]?.label ?? shootDayLabel;
}

function sumTaskCounts(tasks: Record<string, number>) {
  return Object.values(tasks).reduce((total, count) => total + count, 0);
}

function podClientKey(podName: PodName, clientName: string) {
  return `${podName}::${normalizedClientName(clientName)}`;
}

function designerDayCapacity(day: WeekDay) {
  if (day.type === "off") return 0;
  if (day.type === "half") return 3;
  return 6;
}

function writerDayCapacity(day: WeekDay) {
  return designerDayCapacity(day);
}

function emptyDesignerAllocation(workbookPods: WorkbookPods): DesignerAllocation {
  const allocation: DesignerAllocation = { allocations: {}, remaining: {} };

  for (const podName of podNames) {
    for (const client of workbookPods[podName].clients) {
      const clientKey = podClientKey(podName, client[0]);
      allocation.allocations[clientKey] = {};
      allocation.remaining[clientKey] = 0;
    }
  }

  return allocation;
}

function hasDesignerAllocationForPod(
  allocation: DesignerAllocation,
  podName: PodName,
  podData: PodData
) {
  return podData.clients.some((client) => {
    const clientKey = podClientKey(podName, client[0]);
    return (
      sumDesignerTaskCounts(allocation.allocations[clientKey] ?? {}) > 0 ||
      (allocation.remaining[clientKey] ?? 0) > 0
    );
  });
}

function sumDesignerTaskCounts(tasks: Record<string, Record<string, number>>) {
  return Object.values(tasks).reduce(
    (total, designers) => total + Object.values(designers).reduce((dayTotal, count) => dayTotal + count, 0),
    0
  );
}

function buildMonthDesignerAllocations(workbookPods: WorkbookPods, weeks: WeekBlock[]): DesignerAllocation[] {
  const monthAllocations = weeks.map(() => emptyDesignerAllocation(workbookPods));
  const designerUsage: Record<string, Record<string, number>> = {};
  const staticClients: DesignerPlanClient[] = podNames.flatMap((podName) =>
    workbookPods[podName].clients
      .filter((client) => client[6] > 0 && assignedPeople(client[3]).length > 0)
      .map((client) => ({
        client,
        designers: assignedPeople(client[3]),
        podName,
        carryover: 0,
        remaining: client[6],
        total: client[6],
      }))
  );

  for (const [weekIndex, week] of weeks.entries()) {
    const weekAllocation = monthAllocations[weekIndex];
    const isFinalWeek = weekIndex === weeks.length - 1 || week.isBuffer;
    const activeClients = staticClients
      .map((item) => {
        const plannedThisWeek = isFinalWeek
          ? item.remaining
          : Math.min(item.remaining, (split3(item.total)[weekIndex] ?? 0) + item.carryover);

        return { item, plannedThisWeek };
      })
      .filter(({ plannedThisWeek }) => plannedThisWeek > 0);

    if (activeClients.length === 0) continue;

    const targetRemaining = new Map(
      activeClients.map(({ item, plannedThisWeek }) => [podClientKey(item.podName, item.client[0]), plannedThisWeek])
    );
    const rotation = weekIndex % activeClients.length;
    const rotatedClients = activeClients.slice(rotation).concat(activeClients.slice(0, rotation));
    let cursor = 0;

    for (const day of week.days) {
      const capacity = designerDayCapacity(day);
      if (capacity === 0) continue;

      designerUsage[day.dateKey] ??= {};

      while ([...targetRemaining.values()].some((count) => count > 0)) {
        let assigned = false;

        for (let offset = 0; offset < rotatedClients.length; offset += 1) {
          const index = (cursor + offset) % rotatedClients.length;
          const item = rotatedClients[index].item;
          const clientKey = podClientKey(item.podName, item.client[0]);
          const remainingForClient = targetRemaining.get(clientKey) ?? 0;
          if (remainingForClient <= 0) continue;

          const availableDesigner = item.designers
            .map((designer) => ({
              designer,
              key: normalizedClientName(designer),
              used: designerUsage[day.dateKey][normalizedClientName(designer)] ?? 0,
            }))
            .filter(({ used }) => used < capacity)
            .sort((left, right) => left.used - right.used || left.designer.localeCompare(right.designer))[0];

          if (!availableDesigner) continue;

          weekAllocation.allocations[clientKey][day.label] ??= {};
          weekAllocation.allocations[clientKey][day.label][availableDesigner.designer] =
            (weekAllocation.allocations[clientKey][day.label][availableDesigner.designer] ?? 0) + 1;
          designerUsage[day.dateKey][availableDesigner.key] = availableDesigner.used + 1;
          targetRemaining.set(clientKey, remainingForClient - 1);
          cursor = (index + 1) % rotatedClients.length;
          assigned = true;
          break;
        }

        if (!assigned) break;
      }
    }

    for (const { item, plannedThisWeek } of activeClients) {
      const clientKey = podClientKey(item.podName, item.client[0]);
      const allocatedThisWeek = sumDesignerTaskCounts(weekAllocation.allocations[clientKey] ?? {});
      item.remaining = Math.max(item.remaining - allocatedThisWeek, 0);
      item.carryover = isFinalWeek ? 0 : Math.max(plannedThisWeek - allocatedThisWeek, 0);
    }

    if (isFinalWeek) {
      for (const item of staticClients) {
        weekAllocation.remaining[podClientKey(item.podName, item.client[0])] = item.remaining;
      }
    }
  }

  return monthAllocations;
}

function emptyWriterAllocation(workbookPods: WorkbookPods): WriterAllocation {
  const allocation: WriterAllocation = { allocations: {}, remaining: {} };

  for (const podName of podNames) {
    for (const client of workbookPods[podName].clients) {
      const clientKey = podClientKey(podName, client[0]);
      allocation.allocations[clientKey] = {};
      allocation.remaining[clientKey] = 0;
    }
  }

  return allocation;
}

function sumWriterTaskCounts(tasks: Record<string, Record<string, WriterTaskCounts>>) {
  return Object.values(tasks).reduce(
    (total, writers) =>
      total +
      Object.values(writers).reduce(
        (dayTotal, counts) => dayTotal + counts.briefs + counts.scripts,
        0
      ),
    0
  );
}

function hasWriterAllocationForPod(
  allocation: WriterAllocation,
  podName: PodName,
  podData: PodData
) {
  return podData.clients.some((client) => {
    const clientKey = podClientKey(podName, client[0]);
    return (
      sumWriterTaskCounts(allocation.allocations[clientKey] ?? {}) > 0 ||
      (allocation.remaining[clientKey] ?? 0) > 0
    );
  });
}

function buildMonthWriterAllocations(
  workbookPods: WorkbookPods,
  weeks: WeekBlock[],
  designerAllocations: DesignerAllocation[]
): WriterAllocation[] {
  const monthAllocations = weeks.map(() => emptyWriterAllocation(workbookPods));
  const productionByPod = Object.fromEntries(
    podNames.map((podName) => [podName, buildMonthProductionAllocations(workbookPods[podName], weeks)])
  ) as Record<PodName, ProductionAllocation[]>;
  const flatDays = weeks.flatMap((week, weekIndex) =>
    week.days.map((day) => ({ day, weekIndex }))
  );
  const dayIndexByLabel = new Map(flatDays.map((item, index) => [item.day.label, index]));
  const firstDayByWeek = new Map<number, number>();
  flatDays.forEach((item, index) => {
    if (!firstDayByWeek.has(item.weekIndex)) firstDayByWeek.set(item.weekIndex, index);
  });

  const requirements: Array<{
    availableDay: number;
    clientKey: string;
    dueDay: number;
    kind: keyof WriterTaskCounts;
    podName: PodName;
    remaining: number;
    writers: string[];
  }> = [];

  for (const podName of podNames) {
    const podData = workbookPods[podName];

    for (const client of podData.clients) {
      const [clientName, , writer, , , videos, , note] = client;
      const writers = assignedPeople(writer);
      if (writers.length === 0) continue;
      const clientKey = podClientKey(podName, clientName);

      for (const [weekIndex, week] of weeks.entries()) {
        const availableDay = firstDayByWeek.get(weekIndex) ?? 0;
        const designTasks = designerAllocations[weekIndex]?.allocations[clientKey] ?? {};

        for (const [designDay, designers] of Object.entries(designTasks)) {
          const count = Object.values(designers).reduce((total, value) => total + value, 0);
          if (count <= 0) continue;
          const briefDay = previousEditableDayLabel(week, designDay);
          requirements.push({
            availableDay,
            clientKey,
            dueDay: dayIndexByLabel.get(briefDay) ?? availableDay,
            kind: "briefs",
            podName,
            remaining: count,
            writers,
          });
        }

        if (isDirectEditVideo(note)) {
          const count = videos > 0 ? split3(videos)[weekIndex] ?? 0 : 0;
          if (count > 0) {
            requirements.push({
              availableDay,
              clientKey,
              dueDay: availableDay,
              kind: "scripts",
              podName,
              remaining: count,
              writers,
            });
          }
          continue;
        }

        const productionTasks = productionByPod[podName][weekIndex]?.allocations[clientName] ?? {};
        for (const [shootDay, count] of Object.entries(productionTasks)) {
          if (count <= 0) continue;
          const scriptDay = previousEditableDayLabel(week, shootDay);
          requirements.push({
            availableDay,
            clientKey,
            dueDay: dayIndexByLabel.get(scriptDay) ?? availableDay,
            kind: "scripts",
            podName,
            remaining: count,
            writers,
          });
        }
      }
    }
  }

  const writerUsage: Record<string, Record<string, number>> = {};
  let clientCursor = 0;

  for (const [flatDayIndex, { day, weekIndex }] of flatDays.entries()) {
    const capacity = writerDayCapacity(day);
    if (capacity === 0) continue;
    writerUsage[day.dateKey] ??= {};

    while (true) {
      const eligible = requirements
        .filter((item) => item.remaining > 0 && item.availableDay <= flatDayIndex)
        .sort((left, right) => left.dueDay - right.dueDay || left.clientKey.localeCompare(right.clientKey));
      if (eligible.length === 0) break;

      const clients = [...new Set(eligible.map((item) => item.clientKey))];
      let assigned = false;

      for (let offset = 0; offset < clients.length; offset += 1) {
        const clientKey = clients[(clientCursor + offset) % clients.length];
        const requirement = eligible.find((item) => item.clientKey === clientKey);
        if (!requirement) continue;

        const availableWriter = requirement.writers
          .map((writer) => ({
            writer,
            key: normalizedClientName(writer),
            used: writerUsage[day.dateKey][normalizedClientName(writer)] ?? 0,
          }))
          .filter(({ used }) => used < capacity)
          .sort((left, right) => left.used - right.used || left.writer.localeCompare(right.writer))[0];
        if (!availableWriter) continue;

        const weekAllocation = monthAllocations[weekIndex];
        weekAllocation.allocations[clientKey][day.label] ??= {};
        weekAllocation.allocations[clientKey][day.label][availableWriter.writer] ??= {
          briefs: 0,
          scripts: 0,
        };
        weekAllocation.allocations[clientKey][day.label][availableWriter.writer][requirement.kind] += 1;
        writerUsage[day.dateKey][availableWriter.key] = availableWriter.used + 1;
        requirement.remaining -= 1;
        clientCursor = (clients.indexOf(clientKey) + 1) % clients.length;
        assigned = true;
        break;
      }

      if (!assigned) break;
    }
  }

  const finalAllocation = monthAllocations.at(-1);
  if (finalAllocation) {
    for (const requirement of requirements) {
      finalAllocation.remaining[requirement.clientKey] =
        (finalAllocation.remaining[requirement.clientKey] ?? 0) + requirement.remaining;
    }
  }

  return monthAllocations;
}

function previousEditableDayLabel(week: WeekBlock, designDayLabel: string) {
  const designIndex = week.days.findIndex((day) => day.label === designDayLabel);
  const previousDay = week.days
    .slice(0, Math.max(0, designIndex))
    .reverse()
    .find((day) => day.type !== "off");
  return previousDay?.label ?? designDayLabel;
}

function distributedCounts(people: string[], count: number, offset = 0) {
  const allocations = new Map<string, number>();
  if (people.length === 0 || count <= 0) return allocations;

  for (let index = 0; index < count; index += 1) {
    const person = people[(index + offset) % people.length];
    allocations.set(person, (allocations.get(person) ?? 0) + 1);
  }

  return allocations;
}

function appendRoleTask(
  tasksByPerson: Map<string, Record<string, string>>,
  person: string,
  day: string,
  task: string
) {
  const tasks = tasksByPerson.get(person) ?? {};
  tasks[day] = [tasks[day], task].filter(Boolean).join("\n");
  tasksByPerson.set(person, tasks);
}

function splitEditorTasks(tasks: Record<string, string>, editors: string[], offset: number) {
  const tasksByEditor = new Map<string, Record<string, string>>();

  for (const [day, task] of Object.entries(tasks)) {
    const countMatch = task.match(/(\d+)\s+(vid\(s\)|video\(s\))/);
    if (!countMatch) {
      const assignedEditor = editors[offset % editors.length];
      if (assignedEditor) appendRoleTask(tasksByEditor, assignedEditor, day, task);
      continue;
    }

    const total = Number(countMatch[1]);
    for (const [assignedEditor, count] of distributedCounts(editors, total, offset).entries()) {
      appendRoleTask(
        tasksByEditor,
        assignedEditor,
        day,
        task.replace(countMatch[0], countMatch[0].replace(countMatch[1], String(count)))
      );
    }
  }

  return tasksByEditor;
}

function buildRoleRows(
  podName: PodName,
  podData: PodData,
  week: WeekBlock,
  weekIndex: number,
  client: PodClient,
  productionAllocation: ProductionAllocation,
  designerAllocation: DesignerAllocation,
  writerAllocation: WriterAllocation
) {
  const [cname, ctype, writer, designer, editor, vids, , note] = client;
  const directEditVideo = isDirectEditVideo(note);
  const directEditWeekVids = vids > 0 ? split3(vids)[weekIndex] ?? 0 : 0;
  const clientKey = podClientKey(podName, cname);
  const designTasks = designerAllocation.allocations[clientKey] ?? {};
  const writerTasks = writerAllocation.allocations[clientKey] ?? {};
  const wStatics = sumDesignerTaskCounts(designTasks);
  const unscheduledStatics = designerAllocation.remaining[clientKey] ?? 0;
  const unscheduledWriterTasks = writerAllocation.remaining[clientKey] ?? 0;
  const dayKeys = week.days.map((day) => day.label);
  const productionTasks = productionAllocation.allocations[cname] ?? {};
  const scheduledShootCount = directEditVideo ? 0 : sumTaskCounts(productionTasks);
  const unscheduledShootCount = directEditVideo ? 0 : productionAllocation.remaining[cname] ?? 0;
  const plannedVideoCount = directEditVideo ? directEditWeekVids : scheduledShootCount;
  const wVids = plannedVideoCount;
  const weeklyOut = plannedVideoCount + wStatics;
  const rows: RoleRow[] = [];

  if (!isMissingPerson(writer) && (sumWriterTaskCounts(writerTasks) > 0 || unscheduledWriterTasks > 0)) {
    const tasksByWriter = new Map<string, Record<string, string>>();

    for (const [day, writers] of Object.entries(writerTasks)) {
      for (const [assignedWriter, counts] of Object.entries(writers)) {
        if (counts.scripts > 0) {
          appendRoleTask(
            tasksByWriter,
            assignedWriter,
            day,
            `Script ${counts.scripts} task(s)\n[${cname}]\n${assignedWriter}`
          );
        }
        if (counts.briefs > 0) {
          appendRoleTask(
            tasksByWriter,
            assignedWriter,
            day,
            `Brief ${counts.briefs} static(s)\n[${cname}]\n${assignedWriter}`
          );
        }
      }
    }

    if (unscheduledWriterTasks > 0) {
      const assignedWriter = assignedPeople(writer)[0] ?? writer;
      const warningDay = week.days.filter((day) => day.type !== "off").at(-1)?.label ?? dayKeys[0];
      appendRoleTask(
        tasksByWriter,
        assignedWriter,
        warningDay,
        `MONTH SHORT: ${unscheduledWriterTasks} writer task(s) exceed capacity`
      );
    }

    for (const [assignedWriter, tasks] of tasksByWriter) {
      rows.push({
        client: cname,
        service: ctype,
        role: "Writer",
        person: assignedWriter,
        tasks,
        weeklyOut,
        note,
        isFirst: rows.length === 0,
        ...roleColors("Writer"),
      });
    }
  }

  if (!directEditVideo && (scheduledShootCount > 0 || unscheduledShootCount > 0)) {
    const tasks: Record<string, string> = {};
    for (const [shootDay, count] of Object.entries(productionTasks)) {
      const day = week.days.find((item) => item.label === shootDay);
      const dayCap = day ? shootCapacity(podData, day) : 0;
      tasks[shootDay] = `SHOOT ${count} reel(s)\n[${cname}]\nDay cap: ${dayCap} reels total`;
    }
    if (unscheduledShootCount > 0) {
      const warningDay = Object.keys(tasks)[0] ?? dayKeys[0];
      tasks[warningDay] = [
        tasks[warningDay],
        `MONTH SHORT: ${unscheduledShootCount} reel(s) need extension till 3rd / extra shoot day`,
      ].filter(Boolean).join("\n");
    }
    rows.push({
      client: cname,
      service: ctype,
      role: "Production",
      person: "Crew",
      tasks,
      weeklyOut,
      note,
      isFirst: rows.length === 0,
      ...roleColors("Production"),
    });
  }

  if (!isMissingPerson(designer) && (wStatics > 0 || unscheduledStatics > 0)) {
    const tasksByDesigner = new Map<string, Record<string, string>>();

    for (const [designDay, designers] of Object.entries(designTasks)) {
      for (const [assignedDesigner, count] of Object.entries(designers)) {
        const tasks = tasksByDesigner.get(assignedDesigner) ?? {};
        tasks[designDay] = `Design ${count} static(s)\n[${cname}]\n${assignedDesigner}`;
        tasksByDesigner.set(assignedDesigner, tasks);
      }
    }

    if (unscheduledStatics > 0) {
      const assignedDesigner = assignedPeople(designer)[0] ?? designer;
      const tasks = tasksByDesigner.get(assignedDesigner) ?? {};
      const warningDay = week.days.filter((day) => day.type !== "off").at(-1)?.label ?? dayKeys[0];
      tasks[warningDay] = [
        tasks[warningDay],
        `MONTH SHORT: ${unscheduledStatics} static(s) exceed designer capacity`,
      ].filter(Boolean).join("\n");
      tasksByDesigner.set(assignedDesigner, tasks);
    }

    for (const [assignedDesigner, tasks] of tasksByDesigner) {
      rows.push({
        client: cname,
        service: ctype,
        role: "Designer",
        person: assignedDesigner,
        tasks,
        weeklyOut,
        note,
        isFirst: rows.length === 0,
        ...roleColors("Designer"),
      });
    }
  }

  if (!isMissingPerson(editor) && (directEditVideo ? wVids > 0 : scheduledShootCount > 0)) {
    const editors = assignedPeople(editor);
    const tasks: Record<string, string> = {};
    if (directEditVideo) {
      const editDay = dayKeys[1] ?? dayKeys[0];
      const finaliseDay = dayKeys[2] ?? editDay;
      const firstDayCount = Math.ceil(wVids / 2);
      const finaliseCount = wVids - firstDayCount;
      tasks[editDay] = `Edit provided footage / AI\n${firstDayCount} vid(s)\n[${cname}]`;
      if (finaliseCount > 0) {
        const finaliseTask = `Finalise direct edit\n${finaliseCount} vid(s)\n[${cname}] — deliver`;
        tasks[finaliseDay] = [tasks[finaliseDay], finaliseTask].filter(Boolean).join("\n");
      }
    } else {
      for (const [shootDay, count] of Object.entries(productionTasks)) {
        const editDay = nextEditableDayLabel(week, shootDay);
        tasks[editDay] = [
          tasks[editDay],
          `Edit ${count} video(s)\n[${cname}]\nDeliver EOD`,
        ].filter(Boolean).join("\n");
      }
    }
    for (const [assignedEditor, assignedTasks] of splitEditorTasks(tasks, editors, weekIndex)) {
      rows.push({
        client: cname,
        service: ctype,
        role: "Editor",
        person: assignedEditor,
        tasks: assignedTasks,
        weeklyOut,
        note,
        isFirst: rows.length === 0,
        ...roleColors("Editor"),
      });
    }
  }

  return rows;
}

function buildOutputSummaryRows(
  podName: PodName,
  podData: PodData,
  weeks: WeekBlock[],
  designerAllocations: DesignerAllocation[],
  writerAllocations: WriterAllocation[]
): OutputSummaryRow[] {
  const productionAllocations = buildMonthProductionAllocations(podData, weeks);
  const finalAllocation = productionAllocations.at(-1);
  const finalDesignerAllocation = designerAllocations.at(-1);
  const finalWriterAllocation = writerAllocations.at(-1);

  return podData.clients.map(([client, service, , , , videos, statics, note]) => {
    const clientKey = podClientKey(podName, client);
    const isDirectEdit = isDirectEditVideo(note);
    const plannedVideos = isDirectEdit
      ? weeks.reduce((total, _week, weekIndex) => total + (split3(videos)[weekIndex] ?? 0), 0)
      : productionAllocations.reduce(
          (total, allocation) => total + sumTaskCounts(allocation.allocations[client] ?? {}),
          0
        );
    const plannedStatics = designerAllocations.reduce(
      (total, allocation) => total + sumDesignerTaskCounts(allocation.allocations[clientKey] ?? {}),
      0
    );

    return {
      client,
      service,
      plannedVideos,
      plannedStatics,
      requiredVideos: videos,
      requiredStatics: statics,
      remainingVideos: isDirectEdit ? 0 : finalAllocation?.remaining[client] ?? 0,
      remainingStatics: finalDesignerAllocation?.remaining[clientKey] ?? 0,
      remainingWriterTasks: finalWriterAllocation?.remaining[clientKey] ?? 0,
    };
  });
}

function buildBufferRows(clients: readonly PodClient[]): BufferRow[] {
  return clients
    .filter(([cname]) => cname !== "Guideup")
    .map(([cname, ctype, writer, designer, editor, vids, statics]) => {
      if (ctype.includes("PM")) {
        const actions: string[] = [];
        const who: string[] = [];
        const out: string[] = [];
        if (vids > 0) {
          actions.push("Continue shooting & editing additional videos");
          who.push(`Writer: ${writer} → Production → Editor: ${editor}`);
          out.push("4–6 extra videos");
        }
        if (statics > 0) {
          actions.push("Continue designing additional statics");
          who.push(`Writer: ${writer} → Designer: ${designer}`);
          out.push("6–10 extra statics");
        }
        return {
          client: cname,
          service: ctype,
          condition: "If lead/sales target NOT met after W3",
          action: actions.join(" + ") || "—",
          who: who.join("\n") || "—",
          output: out.join(" + ") || "—",
        };
      }

      return {
        client: cname,
        service: ctype,
        condition: "Social only — check engagement targets",
        action: "Additional branding creatives if needed",
        who: `Designer: ${designer}`,
        output: "2–4 statics/videos",
      };
    });
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellXml(cell: XmlCell) {
  const attrs = [
    cell.style ? `ss:StyleID="${cell.style}"` : "",
    cell.mergeAcross ? `ss:MergeAcross="${cell.mergeAcross}"` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `<Cell${attrs ? ` ${attrs}` : ""}><Data ss:Type="String">${escapeXml(cell.value ?? "")}</Data></Cell>`;
}

function rowXml(row: XmlRow) {
  return `<Row${row.height ? ` ss:Height="${row.height}"` : ""}>${row.cells.map(cellXml).join("")}</Row>`;
}

function styleXml(id: string, options: { bg?: string; color?: string; bold?: boolean; size?: number; align?: "Center" | "Left"; wrap?: boolean }) {
  return `<Style ss:ID="${id}">
    <Alignment ss:Horizontal="${options.align ?? "Left"}" ss:Vertical="${options.align === "Center" ? "Center" : "Top"}"${options.wrap === false ? "" : ' ss:WrapText="1"'}/>
    <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BDBDBD"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BDBDBD"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BDBDBD"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BDBDBD"/></Borders>
    <Font ss:Color="#${options.color ?? "000000"}"${options.bold ? ' ss:Bold="1"' : ""}${options.size ? ` ss:Size="${options.size}"` : ""}/>
    ${options.bg ? `<Interior ss:Color="#${options.bg}" ss:Pattern="Solid"/>` : ""}
  </Style>`;
}

function workbookStylesXml() {
  return `<Styles>
    ${styleXml("DefaultCell", { bg: "FAFAFA", color: "000000", size: 8 })}
    ${styleXml("Header", { bg: C.header_bg, color: C.header_fg, bold: true, size: 13, align: "Center" })}
    ${styleXml("SubHeader", { bg: C.subhdr, color: "FFFFFF", size: 9 })}
    ${styleXml("Capacity", { bg: "FFFDE7", color: C.flag, bold: true, size: 8 })}
    ${styleXml("FlagWarn", { bg: "FFF3F3", color: C.warning, size: 8 })}
    ${styleXml("FlagOk", { bg: "F1F8E9", color: "1B5E20", size: 8 })}
    ${styleXml("Week", { bg: C.week_bg, color: C.week_fg, bold: true, size: 10 })}
    ${styleXml("WeekBuffer", { bg: C.w4, color: C.buffer_b, bold: true, size: 10 })}
    ${styleXml("TableHeader", { bg: C.subhdr, color: "FFFFFF", bold: true, size: 8, align: "Center" })}
    ${styleXml("DayHeader", { bg: C.date_bg, color: C.date_fg, bold: true, size: 8, align: "Center" })}
    ${styleXml("HalfHeader", { bg: "FFE0B2", color: C.date_fg, bold: true, size: 8, align: "Center" })}
    ${styleXml("OffHeader", { bg: C.offday, color: C.offday_fg, bold: true, size: 8, align: "Center" })}
    ${styleXml("WriterRole", { bg: C.writer, color: C.writer_b, bold: true, size: 8, align: "Center" })}
    ${styleXml("ProductionRole", { bg: C.production, color: C.production_b, bold: true, size: 8, align: "Center" })}
    ${styleXml("DesignerRole", { bg: C.designer, color: C.designer_b, bold: true, size: 8, align: "Center" })}
    ${styleXml("EditorRole", { bg: C.editor, color: C.editor_b, bold: true, size: 8, align: "Center" })}
    ${styleXml("WriterTask", { bg: C.writer, color: C.writer_b, size: 7 })}
    ${styleXml("ProductionTask", { bg: C.production, color: C.production_b, size: 7 })}
    ${styleXml("DesignerTask", { bg: C.designer, color: C.designer_b, size: 7 })}
    ${styleXml("EditorTask", { bg: C.editor, color: C.editor_b, size: 7 })}
    ${styleXml("Blank", { bg: "FAFAFA", color: "BDBDBD", size: 7 })}
    ${styleXml("Off", { bg: C.offday, color: C.offday_fg, size: 7 })}
    ${styleXml("Half", { bg: "FFE0B2", color: C.offday_fg, size: 7 })}
    ${styleXml("WeekTotal", { bg: "E3F2FD", color: "1565C0", bold: true, size: 8, align: "Center" })}
    ${styleXml("MinOk", { bg: C.min_out, color: "1B5E20", bold: true, size: 9, align: "Center" })}
    ${styleXml("MinWarn", { bg: "FFF3F3", color: C.warning, bold: true, size: 9, align: "Center" })}
    ${styleXml("Buffer", { bg: C.buffer, color: "000000", size: 8 })}
    ${styleXml("LegendHeader", { bg: C.header_bg, color: "FFFFFF", bold: true, size: 10 })}
    ${styleXml("LegendBody", { bg: "FAFAFA", color: "37474F", bold: true, size: 8 })}
  </Styles>`;
}

function roleStyle(role: RoleName) {
  if (role === "Writer") return "WriterRole";
  if (role === "Production") return "ProductionRole";
  if (role === "Designer") return "DesignerRole";
  return "EditorRole";
}

function taskStyle(role: RoleName) {
  if (role === "Writer") return "WriterTask";
  if (role === "Production") return "ProductionTask";
  if (role === "Designer") return "DesignerTask";
  return "EditorTask";
}

function dayHeaderStyle(type: DayType) {
  if (type === "off") return "OffHeader";
  if (type === "half") return "HalfHeader";
  return "DayHeader";
}

function dayCell(row: RoleRow, day: WeekDay) {
  const task = row.tasks[day.label] ?? "";
  if (day.type === "off") return { value: "OFF", style: "Off" };
  if (day.type === "half" && !task) return { value: "½ day", style: "Half" };
  if (!task) return { value: "—", style: "Blank" };
  return { value: task, style: taskStyle(row.role) };
}

function worksheetXml(name: string, rows: XmlRow[], columnWidths: number[]) {
  const columns = columnWidths.map((width) => `<Column ss:Width="${width * 7}"/>`).join("");
  return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${columns}${rows.map(rowXml).join("")}</Table></Worksheet>`;
}

function legendRowsXmlRows() {
  const rows: XmlRow[] = [];

  for (const [label, value] of legendRows) {
    if (value === null && label) {
      rows.push({ height: 20, cells: [{ value: label, style: "LegendHeader", mergeAcross: 1 }] });
    } else if (value && /^[0-9A-F]{6}$/.test(value)) {
      rows.push({ height: 18, cells: [{ value: label, style: "LegendBody" }, { value: "", style: `Swatch${value}` }] });
    } else {
      rows.push({
        height: 18,
        cells: [
          { value: label, style: "LegendBody" },
          { value: value ?? "", style: "DefaultCell" },
        ],
      });
    }
  }

  return rows;
}

function swatchStylesXml() {
  const swatches = [...new Set(legendRows.map(([, value]) => value).filter((value): value is string => Boolean(value && /^[0-9A-F]{6}$/.test(value))))];
  return swatches.map((value) => styleXml(`Swatch${value}`, { bg: value, color: "000000", size: 8 })).join("");
}

function podRowsXmlRows(
  podName: PodName,
  podData: PodData,
  weeks: WeekBlock[],
  monthLabel: string,
  designerAllocations: DesignerAllocation[],
  writerAllocations: WriterAllocation[]
) {
  const rows: XmlRow[] = [];
  const shootInfo = `  📅 Shoot days: ${Object.entries(podData.shoot_days)
    .map(([day, type]) => `${day} (${type === "full" ? "Full day 4–5 reels" : "Half day 2–3 reels"})`)
    .join("  |  ")}`;
  const capText = `  ⚡ Capacity: ${Object.entries(podData.capacity).map(([key, value]) => `${key}: ${value}`).join("   |   ")}`;

  rows.push({ height: 28, cells: [{ value: `🎯 POD: ${podName}  |  ${monthLabel} Daily Production Plan`, style: "Header", mergeAcross: 13 }] });
  rows.push({ height: 18, cells: [{ value: shootInfo, style: "SubHeader", mergeAcross: 13 }] });
  rows.push({ height: 30, cells: [{ value: capText, style: "Capacity", mergeAcross: 13 }] });

  for (const flag of podData.flags) {
    rows.push({ height: 16, cells: [{ value: flag, style: flag.includes("⚠️") ? "FlagWarn" : "FlagOk", mergeAcross: 13 }] });
  }

  rows.push({ cells: [] });

  for (const [weekIndex, week] of weeks.entries()) {
    rows.push({
      height: 22,
      cells: [{
        value: `${week.isBuffer ? "🔒 " : "📅 "}${week.name}${week.isBuffer ? "  ← Buffer week: PM clients that missed lead/sales target keep producing here" : ""}`,
        style: week.isBuffer ? "WeekBuffer" : "Week",
        mergeAcross: 13,
      }],
    });

    const productionAllocation = buildProductionAllocation(podData, weeks, weekIndex);
    const designerAllocation = designerAllocations[weekIndex] ?? emptyDesignerAllocation(pods);
    const writerAllocation = writerAllocations[weekIndex] ?? emptyWriterAllocation(pods);
    const hasCatchUpProduction =
      week.isBuffer &&
      (
        hasProductionAllocation(productionAllocation) ||
        hasDesignerAllocationForPod(designerAllocation, podName, podData) ||
        hasWriterAllocationForPod(writerAllocation, podName, podData)
      );

    if (week.isBuffer && !hasCatchUpProduction) {
      rows.push({
        cells: ["Client", "Service", "Condition", "Action in W4", "Who", "Est. Output"].map((value) => ({ value, style: "TableHeader" })),
      });

      for (const bufferRow of buildBufferRows(podData.clients)) {
        rows.push({
          height: 32,
          cells: [
            { value: bufferRow.client, style: "Buffer" },
            { value: bufferRow.service, style: "Buffer" },
            { value: bufferRow.condition, style: "Buffer" },
            { value: bufferRow.action, style: "Buffer" },
            { value: bufferRow.who, style: "Buffer" },
            { value: bufferRow.output, style: "Buffer" },
          ],
        });
      }

      rows.push({ cells: [] });
      rows.push({ height: 18, cells: [{ value: "✅ If ALL PM targets met → W4 = team rest, review, next-month planning. Social clients: check engagement & refine if needed.", style: "FlagOk", mergeAcross: 13 }] });
      rows.push({ cells: [] });
      continue;
    }

    rows.push({
      cells: [
        { value: "Client", style: "TableHeader" },
        { value: "Service", style: "TableHeader" },
        { value: "Role", style: "TableHeader" },
        ...week.days.map((day) => ({ value: day.label, style: dayHeaderStyle(day.type) })),
        { value: "Week Total", style: "TableHeader" },
        { value: "Min 1–2 Out?", style: "TableHeader" },
      ],
    });

    for (const client of podData.clients) {
      const roleRows = buildRoleRows(
        podName,
        podData,
        week,
        weekIndex,
        client,
        productionAllocation,
        designerAllocation,
        writerAllocation
      );
      if (roleRows.length === 0) {
        rows.push({ height: 16, cells: [{ value: week.isBuffer ? `${client[0]} (${client[1]}) — no catch-up scheduled this week` : `${client[0]} (${client[1]}) — TBD | ${client[7]}`, style: "Off", mergeAcross: 13 }] });
        continue;
      }

      roleRows.forEach((roleRow, rowIndex) => {
        const first = rowIndex === 0;
        rows.push({
          height: 44,
          cells: [
            { value: first ? roleRow.client : "", style: first ? "DefaultCell" : "Blank" },
            { value: first ? roleRow.service : "", style: first ? "DefaultCell" : "Blank" },
            { value: `${roleRow.role}\n${roleRow.person}`, style: roleStyle(roleRow.role) },
            ...week.days.map((day) => dayCell(roleRow, day)),
            { value: first ? `${roleRow.weeklyOut} outs` : "", style: first ? "WeekTotal" : "Blank" },
            { value: first ? (roleRow.weeklyOut >= 1 ? "✅" : "⚠️ CHECK") : "", style: first ? (roleRow.weeklyOut >= 1 ? "MinOk" : "MinWarn") : "Blank" },
          ],
        });
      });

      rows.push({ cells: [] });
    }

    rows.push({ cells: [] });
    rows.push({ cells: [] });
  }

  rows.push({ cells: [] });
  rows.push({
    height: 22,
    cells: [{ value: "Monthly output summary by client", style: "Week", mergeAcross: 13 }],
  });
  rows.push({
    cells: ["Client", "Service", "Video outs", "Static outs", "Required videos", "Required statics", "Writer short", "Video short", "Static short"].map((value) => ({
      value,
      style: "TableHeader",
    })),
  });

  for (const summary of buildOutputSummaryRows(podName, podData, weeks, designerAllocations, writerAllocations)) {
    rows.push({
      height: 24,
      cells: [
        { value: summary.client, style: "DefaultCell" },
        { value: summary.service, style: "DefaultCell" },
        { value: `${summary.plannedVideos} / ${summary.requiredVideos}`, style: "WeekTotal" },
        { value: `${summary.plannedStatics} / ${summary.requiredStatics}`, style: "WeekTotal" },
        { value: String(summary.requiredVideos), style: "DefaultCell" },
        { value: String(summary.requiredStatics), style: "DefaultCell" },
        {
          value: summary.remainingWriterTasks > 0 ? `${summary.remainingWriterTasks} exceed writer capacity` : "0",
          style: summary.remainingWriterTasks > 0 ? "MinWarn" : "MinOk",
        },
        {
          value: summary.remainingVideos > 0 ? `${summary.remainingVideos} need extension till 3rd / extra shoot` : "0",
          style: summary.remainingVideos > 0 ? "MinWarn" : "MinOk",
        },
        {
          value: summary.remainingStatics > 0 ? `${summary.remainingStatics} exceed designer capacity` : "0",
          style: summary.remainingStatics > 0 ? "MinWarn" : "MinOk",
        },
      ],
    });
  }

  return rows;
}

export function buildWorkbookXml(monthKey: string, workbookPods: WorkbookPods = pods) {
  const weeks = buildWeeks(monthKey);
  const monthLabel = formatMonthLabel(monthKey);
  const designerAllocations = buildMonthDesignerAllocations(workbookPods, weeks);
  const writerAllocations = buildMonthWriterAllocations(workbookPods, weeks, designerAllocations);
  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>${workbookStylesXml().replace("<Styles>", "").replace("</Styles>", "")}${swatchStylesXml()}</Styles>
  ${worksheetXml("LEGEND & RULES", legendRowsXmlRows(), [28, 60])}
  ${podNames.map((podName) => worksheetXml(podName, podRowsXmlRows(podName, workbookPods[podName], weeks, monthLabel, designerAllocations, writerAllocations), [18, 8, 14, 16, 16, 16, 16, 16, 16, 12, 14, 14, 14, 14])).join("")}
</Workbook>`;

  return workbook;
}

function roleForDepartment(departmentName?: string | null): RoleName | null {
  if (departmentName === "Content Writer") return "Writer";
  if (departmentName === "Designer") return "Designer";
  if (departmentName === "Editor") return "Editor";
  if (departmentName === "Production") return "Production";
  return null;
}

function cleanPersonName(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9\s/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function personMatches(rowPerson: string, employeeName: string) {
  if (rowPerson === "Crew") return false;

  const employee = cleanPersonName(employeeName);
  const employeeFirst = employee.split(" ")[0] ?? "";
  const people = rowPerson.split(/[\/,]/).map(cleanPersonName).filter(Boolean);

  return people.some((person) => {
    if (employee.includes(person) || person.includes(employee)) return true;
    const personFirst = person.split(" ")[0] ?? "";
    return employeeFirst.length > 2 && employeeFirst === personFirst;
  });
}

export function getEmployeePlannerItems(
  monthKey: string,
  employeeName: string,
  departmentName?: string | null,
  savedWorkbookPods: WorkbookPods = pods
): EmployeePlannerItem[] {
  const targetRole = roleForDepartment(departmentName);
  if (!targetRole) return [];

  const weeks = buildWeeks(monthKey);
  const designerAllocations = buildMonthDesignerAllocations(savedWorkbookPods, weeks);
  const writerAllocations = buildMonthWriterAllocations(savedWorkbookPods, weeks, designerAllocations);
  const items: EmployeePlannerItem[] = [];

  for (const podName of podNames) {
    const podData = savedWorkbookPods[podName];

    for (const [weekIndex, week] of weeks.entries()) {
      const productionAllocation = buildProductionAllocation(podData, weeks, weekIndex);
      const designerAllocation = designerAllocations[weekIndex] ?? emptyDesignerAllocation(savedWorkbookPods);
      const writerAllocation = writerAllocations[weekIndex] ?? emptyWriterAllocation(savedWorkbookPods);
      if (
        week.isBuffer &&
        !hasProductionAllocation(productionAllocation) &&
        !hasDesignerAllocationForPod(designerAllocation, podName, podData) &&
        !hasWriterAllocationForPod(writerAllocation, podName, podData)
      ) continue;

      for (const client of podData.clients) {
        const rows = buildRoleRows(
          podName,
          podData,
          week,
          weekIndex,
          client,
          productionAllocation,
          designerAllocation,
          writerAllocation
        );

        for (const row of rows) {
          if (row.role !== targetRole) continue;
          const matchesPerson = row.role === "Production" && row.person === "Crew" ? true : personMatches(row.person, employeeName);
          if (!matchesPerson) continue;

          for (const [dayIndex, day] of week.days.entries()) {
            const task = row.tasks[day.label];
            if (!task || day.type === "off") continue;

            items.push({
              client: row.client,
              dateLabel: day.label,
              dueSoon: isDueSoon(day.dateKey),
              order: weekIndex * 10 + dayIndex,
              podName,
              role: row.role,
              service: row.service,
              task,
              weekName: week.name,
            });
          }
        }
      }
    }
  }

  return items.sort(
    (left, right) =>
      left.order - right.order ||
      left.client.localeCompare(right.client)
  );
}

function downloadWorkbook(monthKey: string, workbookPods: WorkbookPods) {
  const blob = new Blob([buildWorkbookXml(monthKey, workbookPods)], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${monthKey}_pod_daily_plan.xls`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function PodRoutinePlannerPanel({
  monthKey,
  onMonthChange,
}: {
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
}) {
  const [activeSheet, setActiveSheet] = useState<SheetName>("LEGEND & RULES");
  const [clientDrafts, setClientDrafts] = useState<WorkbookClientDraft[]>(createCurrentWorkbookClientDrafts);
  const [generatedPods, setGeneratedPods] = useState<WorkbookPods | null>(null);
  const [generationMessage, setGenerationMessage] = useState("");
  const [workbookUsers, setWorkbookUsers] = useState<WorkbookUser[]>([]);
  const [loadingWorkbook, setLoadingWorkbook] = useState(true);
  const [savingWorkbook, setSavingWorkbook] = useState(false);
  const weeks = useMemo(() => buildWeeks(monthKey), [monthKey]);
  const workbookPods = generatedPods ?? pods;
  const designerAllocations = useMemo(
    () => buildMonthDesignerAllocations(workbookPods, weeks),
    [workbookPods, weeks]
  );
  const writerAllocations = useMemo(
    () => buildMonthWriterAllocations(workbookPods, weeks, designerAllocations),
    [workbookPods, weeks, designerAllocations]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadWorkbook() {
      setLoadingWorkbook(true);
      setGenerationMessage("");
      const response = await fetch(`/api/production-workbook?monthKey=${encodeURIComponent(monthKey)}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as WorkbookApiPayload | null;
      if (cancelled) return;

      setLoadingWorkbook(false);
      if (!response.ok || !payload) {
        setGenerationMessage(payload?.error ?? "Could not load the saved production workbook.");
        return;
      }

      const drafts = workbookDraftsFromPayload(payload);
      setWorkbookUsers(payload.users ?? []);
      setClientDrafts(drafts.length > 0 ? drafts : [createWorkbookClientDraft()]);
      setGeneratedPods(buildWorkbookPods(drafts));
    }

    void loadWorkbook();
    return () => {
      cancelled = true;
    };
  }, [monthKey]);

  function updateClientDraft(id: string, patch: Partial<WorkbookClientDraft>) {
    setClientDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  }

  function removeClientDraft(id: string) {
    setClientDrafts((current) => {
      const next = current.filter((draft) => draft.id !== id);
      return next.length > 0 ? next : [createWorkbookClientDraft()];
    });
  }

  function updateRoleSelection(
    draftId: string,
    role: "writer" | "designer" | "editor",
    selectedIds: string[]
  ) {
    const selectedNames = selectedIds
      .map((userId) => workbookUsers.find((user) => user.id === userId)?.name)
      .filter((name): name is string => Boolean(name));

    updateClientDraft(draftId, {
      [`${role}Ids`]: selectedIds,
      [`${role}Names`]: selectedNames,
    });
  }

  function usersForRole(role: "writer" | "designer" | "editor") {
    const departmentTerm = role === "writer" ? "writer" : role;
    const matching = workbookUsers.filter((user) =>
      user.departmentName?.toLocaleLowerCase().includes(departmentTerm)
    );
    return matching.length > 0 ? matching : workbookUsers;
  }

  function generateWorkbook() {
    const validDrafts = clientDrafts.filter((draft) => draft.client.trim());

    if (validDrafts.length === 0) {
      setGenerationMessage("Add at least one client before generating the sheet.");
      return;
    }

    const nextPods = buildWorkbookPods(validDrafts);
    const firstPod = podNames.find((podName) => nextPods[podName].clients.length > 0);
    setGeneratedPods(nextPods);
    setActiveSheet(firstPod ?? "LEGEND & RULES");
    setGenerationMessage(
      `${validDrafts.length} client${validDrafts.length === 1 ? "" : "s"} generated for ${formatMonthLabel(monthKey)}.`
    );
  }

  async function saveWorkbook() {
    const validDrafts = clientDrafts.filter((draft) => draft.client.trim());
    if (validDrafts.length === 0) {
      setGenerationMessage("Add at least one client before saving.");
      return;
    }

    setSavingWorkbook(true);
    setGenerationMessage("");
    const response = await fetch("/api/production-workbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monthKey,
        rows: validDrafts.map((draft) => ({
          clientId: draft.clientId,
          clientName: draft.client,
          podName: draft.podName,
          service: draft.service,
          videos: draft.videos,
          statics: draft.statics,
          writerIds: draft.writerIds,
          designerIds: draft.designerIds,
          editorIds: draft.editorIds,
        })),
      }),
    });
    const payload = (await response.json().catch(() => null)) as WorkbookApiPayload | null;
    setSavingWorkbook(false);

    if (!response.ok || !payload) {
      setGenerationMessage(payload?.error ?? "Could not save the production workbook.");
      return;
    }

    const savedDrafts = workbookDraftsFromPayload(payload);
    const nextPods = buildWorkbookPods(savedDrafts);
    setWorkbookUsers(payload.users ?? workbookUsers);
    setClientDrafts(savedDrafts);
    setGeneratedPods(nextPods);
    setGenerationMessage(`Saved ${savedDrafts.length} clients for ${formatMonthLabel(monthKey)}.`);
    window.dispatchEvent(new CustomEvent("production-workbook-saved", { detail: { monthKey } }));
  }

  return (
    <section className="card planner-shell mt-5 rounded-2xl p-4 sm:p-6 xl:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase text-muted">planner</p>
          <h2 className="mt-2 text-4xl font-normal">Production workbook</h2>
          <p className="mt-2 text-base text-muted">{formatMonthLabel(monthKey)}</p>
        </div>
        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[220px_auto]">
          <input
            type="month"
            value={monthKey}
            onChange={(event) => onMonthChange(event.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          />
          <button
            type="button"
            onClick={() => downloadWorkbook(monthKey, workbookPods)}
            className="border border-[var(--border-strong)] px-5 py-3 text-base"
          >
            Download Excel
          </button>
        </div>
      </div>

      <section className="module-theme-item mt-5 border border-[var(--border-soft)] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-2xl font-normal">Current clients and deliverables</h3>
            <p className="mt-1 text-sm text-muted">
              Edit current monthly quantities, move clients between pods, or add a new client before generating.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setClientDrafts((current) => [...current, createWorkbookClientDraft(crypto.randomUUID())])}
            className="border border-[var(--border)] px-4 py-2 text-sm"
          >
            Add client
          </button>
        </div>

        {loadingWorkbook ? <p className="mt-4 text-sm text-muted">Loading saved clients and assignments...</p> : null}

        <div className="mt-4 grid gap-3">
          {clientDrafts.map((draft, index) => (
            <article
              key={draft.id}
              className="rounded-xl border border-[var(--border-soft)] p-3"
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(180px,1.5fr)_minmax(120px,0.7fr)_minmax(120px,0.7fr)_100px_100px_auto]">
                <label className="grid gap-1 text-xs text-muted">
                  Client {index + 1}
                  <input
                    value={draft.client}
                    onChange={(event) => updateClientDraft(draft.id, { client: event.target.value })}
                    placeholder="Client name"
                    className="px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-xs text-muted">
                  Pod
                  <select
                    value={draft.podName}
                    onChange={(event) => updateClientDraft(draft.id, { podName: event.target.value as PodName })}
                    className="px-3 py-2 text-sm"
                  >
                    {podNames.map((podName) => (
                      <option key={podName} value={podName}>{podName}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-muted">
                  Service
                  <select
                    value={draft.service}
                    onChange={(event) =>
                      updateClientDraft(draft.id, { service: event.target.value as WorkbookClientDraft["service"] })
                    }
                    className="px-3 py-2 text-sm"
                  >
                    <option value="PM">PM</option>
                    <option value="SM">SM</option>
                    <option value="PM+SM">PM+SM</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs text-muted">
                  Videos
                  <input
                    type="number"
                    min="0"
                    value={draft.videos}
                    onChange={(event) => updateClientDraft(draft.id, { videos: Number(event.target.value) || 0 })}
                    className="px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-xs text-muted">
                  Statics
                  <input
                    type="number"
                    min="0"
                    value={draft.statics}
                    onChange={(event) => updateClientDraft(draft.id, { statics: Number(event.target.value) || 0 })}
                    className="px-3 py-2 text-sm"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeClientDraft(draft.id)}
                  className="self-end border border-[var(--border)] px-4 py-2 text-sm"
                >
                  Remove
                </button>
              </div>

              <div className="mt-3 grid gap-3 border-t border-[var(--border-soft)] pt-3 md:grid-cols-3">
                {(["writer", "designer", "editor"] as const).map((role) => {
                  const selectedIds = draft[`${role}Ids`];
                  return (
                    <label key={role} className="grid gap-1 text-xs capitalize text-muted">
                      {role}s
                      <select
                        multiple
                        value={selectedIds}
                        onChange={(event) =>
                          updateRoleSelection(
                            draft.id,
                            role,
                            Array.from(event.currentTarget.selectedOptions, (option) => option.value)
                          )
                        }
                        className="min-h-28 px-3 py-2 text-sm"
                      >
                        {usersForRole(role).map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                      <span className="normal-case text-[11px] text-muted">
                        Ctrl/Cmd-click to select multiple.
                      </span>
                    </label>
                  );
                })}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={generateWorkbook}
            className="bg-[var(--primary)] px-5 py-3 text-sm text-[var(--primary-foreground)]"
          >
            Generate sheet
          </button>
          <button
            type="button"
            onClick={saveWorkbook}
            disabled={savingWorkbook || loadingWorkbook}
            className="border border-[var(--border-strong)] px-5 py-3 text-sm disabled:opacity-50"
          >
            {savingWorkbook ? "Saving..." : "Save clients & deliverables"}
          </button>
          {generationMessage ? <p className="text-sm text-muted">{generationMessage}</p> : null}
        </div>
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        {sheetNames.map((sheetName) => (
          <button
            key={sheetName}
            type="button"
            onClick={() => setActiveSheet(sheetName)}
            className={`border px-4 py-2 text-sm ${activeSheet === sheetName ? "border-[var(--border-strong)] bg-[var(--surface-soft)]" : "border-[var(--border)]"}`}
          >
            {sheetName}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {activeSheet === "LEGEND & RULES" ? (
          <LegendSheet />
        ) : (
          <PodSheet
            podName={activeSheet}
            podData={workbookPods[activeSheet]}
            designerAllocations={designerAllocations}
            writerAllocations={writerAllocations}
            weeks={weeks}
            monthLabel={formatMonthLabel(monthKey)}
          />
        )}
      </div>
    </section>
  );
}

function LegendSheet() {
  return (
    <section className="planner-workbook-sheet">
      <div className="planner-table-card overflow-hidden rounded-xl border border-[var(--border-soft)]">
        <table className="planner-excel-table w-full min-w-[680px]">
          <tbody>
            {legendRows.map(([label, value], index) => {
              if (value === null && label) {
                return (
                  <tr key={`${label}-${index}`}>
                    <td colSpan={2} className="excel-section-header">{label}</td>
                  </tr>
                );
              }

              const isSwatch = Boolean(value && /^[0-9A-F]{6}$/.test(value));
              return (
                <tr key={`${label}-${index}`}>
                  <td className="excel-legend-label">{label}</td>
                  <td className="excel-legend-value" style={isSwatch ? { backgroundColor: `#${value}` } : undefined}>
                    {isSwatch ? "" : value ?? ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PodSheet({
  designerAllocations,
  writerAllocations,
  monthLabel,
  podData,
  podName,
  weeks,
}: {
  designerAllocations: DesignerAllocation[];
  writerAllocations: WriterAllocation[];
  monthLabel: string;
  podData: PodData;
  podName: PodName;
  weeks: WeekBlock[];
}) {
  const shootInfo = `📅 Shoot days: ${Object.entries(podData.shoot_days)
    .map(([day, type]) => `${day} (${type === "full" ? "Full day 4–5 reels" : "Half day 2–3 reels"})`)
    .join(" | ")}`;
  const capText = `⚡ Capacity: ${Object.entries(podData.capacity).map(([key, value]) => `${key}: ${value}`).join(" | ")}`;

  return (
    <section className="planner-workbook-sheet">
      <div className="excel-title">🎯 POD: {podName} | {monthLabel} Daily Production Plan</div>
      <div className="excel-subheader">{shootInfo}</div>
      <div className="excel-capacity">{capText}</div>
      {podData.flags.map((flag) => (
        <div key={flag} className={flag.includes("⚠️") ? "excel-flag-warn" : "excel-flag-ok"}>{flag}</div>
      ))}

      <div className="mt-6 grid gap-8">
        {weeks.map((week, index) => {
          const productionAllocation = buildProductionAllocation(podData, weeks, index);
          const designerAllocation = designerAllocations[index] ?? emptyDesignerAllocation(pods);
          const writerAllocation = writerAllocations[index] ?? emptyWriterAllocation(pods);
          const showBufferOnly =
            week.isBuffer &&
            !hasProductionAllocation(productionAllocation) &&
            !hasDesignerAllocationForPod(designerAllocation, podName, podData) &&
            !hasWriterAllocationForPod(writerAllocation, podName, podData);

          return showBufferOnly ? (
            <BufferWeek key={week.key} podData={podData} week={week} />
          ) : (
            <WorkingWeek
              key={week.key}
              podName={podName}
              podData={podData}
              designerAllocation={designerAllocation}
              writerAllocation={writerAllocation}
              weeks={weeks}
              week={week}
              weekIndex={index}
            />
          );
        })}
        <OutputSummaryTable
          podName={podName}
          podData={podData}
          designerAllocations={designerAllocations}
          writerAllocations={writerAllocations}
          weeks={weeks}
        />
      </div>
    </section>
  );
}

function WorkingWeek({
  designerAllocation,
  writerAllocation,
  podName,
  podData,
  week,
  weekIndex,
  weeks,
}: {
  designerAllocation: DesignerAllocation;
  writerAllocation: WriterAllocation;
  podName: PodName;
  podData: PodData;
  week: WeekBlock;
  weekIndex: number;
  weeks: WeekBlock[];
}) {
  const productionAllocation = buildProductionAllocation(podData, weeks, weekIndex);

  return (
    <section>
      <div className="excel-week-header">📅 {week.name}</div>
      <div className="planner-table-card rounded-xl border border-[var(--border-soft)] bg-white p-0">
        <div className="planner-table-wrap scroll-area">
          <table className="planner-excel-table min-w-[1180px]">
            <thead>
              <tr>
                <th>Client</th>
                <th>Service</th>
                <th>Role</th>
                {week.days.map((day) => (
                  <th key={day.label} className={day.type === "off" ? "excel-off-head" : day.type === "half" ? "excel-half-head" : ""}>
                    {day.label}
                  </th>
                ))}
                <th>Week Total</th>
                <th>Min 1–2 Out?</th>
              </tr>
            </thead>
            <tbody>
              {podData.clients.map((client) => {
                const rows = buildRoleRows(
                  podName,
                  podData,
                  week,
                  weekIndex,
                  client,
                  productionAllocation,
                  designerAllocation,
                  writerAllocation
                );
                if (rows.length === 0) {
                  return (
                    <tr key={`${week.key}-${client[0]}-tbd`}>
                      <td colSpan={week.days.length + 5} className="excel-off-cell">
                        {week.isBuffer ? `${client[0]} (${client[1]}) — no catch-up scheduled this week` : `${client[0]} (${client[1]}) — TBD | ${client[7]}`}
                      </td>
                    </tr>
                  );
                }

                return rows.map((row, rowIndex) => {
                  const first = rowIndex === 0;
                  return (
                    <tr key={`${week.key}-${row.client}-${row.role}-${row.person}`}>
                      <td className={first ? "excel-client-cell" : "excel-muted-cell"}>{first ? row.client : ""}</td>
                      <td className={first ? "" : "excel-muted-cell"}>{first ? row.service : ""}</td>
                      <td className={`excel-role-cell excel-role-${row.role.toLowerCase()}`}>
                        <span className="block">{row.role}</span>
                        <span className="mt-1 block text-[0.68rem] font-normal">{row.person}</span>
                      </td>
                      {week.days.map((day) => {
                const task = row.tasks[day.label] ?? "";
                const dueSoon = Boolean(task && isDueSoon(day.dateKey));
                return (
                  <td
                    key={day.label}
                    className={
                      day.type === "off"
                        ? "excel-off-cell"
                        : task
                          ? `excel-task-cell excel-task-${row.role.toLowerCase()}${dueSoon ? " excel-task-due-soon" : ""}`
                          : day.type === "half"
                            ? "excel-half-cell"
                            : "excel-blank-cell"
                    }
                  >
                            {day.type === "off" ? "OFF" : task || (day.type === "half" ? "½ day" : "—")}
                          </td>
                        );
                      })}
                      <td className={first ? "excel-week-total" : "excel-muted-cell"}>{first ? `${row.weeklyOut} outs` : ""}</td>
                      <td className={first ? (row.weeklyOut >= 1 ? "excel-min-ok" : "excel-min-warn") : "excel-muted-cell"}>
                        {first ? (row.weeklyOut >= 1 ? "✅" : "⚠️ CHECK") : ""}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function OutputSummaryTable({
  designerAllocations,
  writerAllocations,
  podData,
  podName,
  weeks,
}: {
  designerAllocations: DesignerAllocation[];
  writerAllocations: WriterAllocation[];
  podData: PodData;
  podName: PodName;
  weeks: WeekBlock[];
}) {
  const rows = buildOutputSummaryRows(podName, podData, weeks, designerAllocations, writerAllocations);

  return (
    <section>
      <div className="excel-week-header">Monthly output summary by client</div>
      <div className="planner-table-card rounded-xl border border-[var(--border-soft)] bg-white p-0">
        <div className="planner-table-wrap scroll-area">
          <table className="planner-excel-table min-w-[860px]">
            <thead>
              <tr>
                <th>Client</th>
                <th>Service</th>
                <th>Video outs</th>
                <th>Static outs</th>
                <th>Required videos</th>
                <th>Required statics</th>
                <th>Writer short</th>
                <th>Video short</th>
                <th>Static short</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.client}>
                  <td className="excel-client-cell">{row.client}</td>
                  <td>{row.service}</td>
                  <td className="excel-week-total">{row.plannedVideos} / {row.requiredVideos}</td>
                  <td className="excel-week-total">{row.plannedStatics} / {row.requiredStatics}</td>
                  <td>{row.requiredVideos}</td>
                  <td>{row.requiredStatics}</td>
                  <td className={row.remainingWriterTasks > 0 ? "excel-min-warn" : "excel-min-ok"}>
                    {row.remainingWriterTasks > 0 ? `${row.remainingWriterTasks} exceed writer capacity` : "0"}
                  </td>
                  <td className={row.remainingVideos > 0 ? "excel-min-warn" : "excel-min-ok"}>
                    {row.remainingVideos > 0 ? `${row.remainingVideos} need extension till 3rd / extra shoot` : "0"}
                  </td>
                  <td className={row.remainingStatics > 0 ? "excel-min-warn" : "excel-min-ok"}>
                    {row.remainingStatics > 0 ? `${row.remainingStatics} exceed designer capacity` : "0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function BufferWeek({ podData, week }: { podData: PodData; week: WeekBlock }) {
  return (
    <section>
      <div className="excel-week-header excel-week-buffer">🔒 {week.name} ← Buffer week: PM clients that missed lead/sales target keep producing here</div>
      <div className="planner-table-card rounded-xl border border-[var(--border-soft)] bg-white p-0">
        <div className="planner-table-wrap scroll-area">
          <table className="planner-excel-table min-w-[980px]">
            <thead>
              <tr>
                <th>Client</th>
                <th>Service</th>
                <th>Condition</th>
                <th>Action in W4</th>
                <th>Who</th>
                <th>Est. Output</th>
              </tr>
            </thead>
            <tbody>
              {buildBufferRows(podData.clients).map((row) => (
                <tr key={row.client}>
                  <td className="excel-buffer-cell">{row.client}</td>
                  <td className="excel-buffer-cell">{row.service}</td>
                  <td className="excel-buffer-cell">{row.condition}</td>
                  <td className="excel-buffer-cell">{row.action}</td>
                  <td className="excel-buffer-cell">{row.who}</td>
                  <td className="excel-buffer-cell">{row.output}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="excel-buffer-note">✅ If ALL PM targets met → W4 = team rest, review, next-month planning. Social clients: check engagement & refine if needed.</div>
    </section>
  );
}
