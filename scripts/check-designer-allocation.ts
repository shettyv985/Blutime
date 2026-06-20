import {
  buildWorkbookPods,
  buildWorkbookXml,
  getEmployeePlannerItems,
} from "../components/admin/PodRoutinePlannerPanel";

const drafts = [
  {
    id: "kia",
    clientId: "kia",
    sourceClientName: "Kia",
    client: "Kia",
    podName: "ROBISH",
    service: "PM+SM",
    videos: 12,
    statics: 81,
    writerIds: ["naveen", "fathima"],
    writerNames: ["Naveen", "Fathima"],
    designerIds: ["akhil", "shwetha"],
    designerNames: ["Akhil", "Shwetha"],
    editorIds: ["adithyan", "jabin"],
    editorNames: ["Adithyan", "Jabin"],
  },
  { id: "activbase", sourceClientName: "Activbase", client: "Activbase", podName: "ROBISH", service: "PM", videos: 5, statics: 10 },
  { id: "memory-train", sourceClientName: "Memory Train", client: "Memory Train", podName: "ROBISH", service: "PM", videos: 5, statics: 10 },
  { id: "pawan", sourceClientName: "Pawan", client: "Pawan", podName: "ROBISH", service: "PM+SM", videos: 12, statics: 10 },
  { id: "chakolas", sourceClientName: "Chakolas", client: "Chakolas", podName: "RELSA", service: "PM+SM", videos: 15, statics: 30 },
  { id: "geojit", sourceClientName: "Geojit", client: "Geojit", podName: "RELSA", service: "SM", videos: 5, statics: 30 },
  { id: "dk-healthcare", sourceClientName: "DK Healthcare", client: "DK Healthcare", podName: "RESHMA", service: "SM", videos: 0, statics: 30 },
  { id: "dkg", sourceClientName: "DKG", client: "DKG", podName: "RESHMA", service: "SM", videos: 0, statics: 30 },
] as Parameters<typeof buildWorkbookPods>[0];

const workbookPods = buildWorkbookPods(drafts);
const xml = buildWorkbookXml("2026-06", workbookPods);
const totals = new Map<string, number>();

for (const podName of ["ROBISH", "RELSA", "RESHMA"]) {
  const sheet = xml.match(new RegExp(`<Worksheet ss:Name="${podName}">([\\s\\S]*?)<\\/Worksheet>`))?.[1] ?? "";
  let week = "";

  for (const rowMatch of sheet.matchAll(/<Row[^>]*>([\s\S]*?)<\/Row>/g)) {
    const row = rowMatch[1];
    const weekMatch = row.match(/W([1-4]) \(/);
    if (weekMatch) week = `W${weekMatch[1]}`;
    if (!row.includes("Designer")) continue;

    const cells = [...row.matchAll(/<Cell[^>]*>([\s\S]*?)<\/Cell>/g)];
    cells.forEach((cell, index) => {
      const task = cell[1].match(/Design (\d+) static\(s\)\n\[[^\]]+\]\n([^<\n]+)/);
      if (!task) return;
      const designer = task[2].trim().toLowerCase();
      const key = `${week}:column-${index}:${designer}`;
      totals.set(key, (totals.get(key) ?? 0) + Number(task[1]));
    });
  }
}

const allocations = [...totals.entries()];
const writerFairnessPods = buildWorkbookPods(
  ([
    ["Abad", 18],
    ["Activbase", 18],
    ["Other Client", 18],
  ] as Array<[string, number]>).map(([client, statics], index) => ({
    id: `writer-${index}`,
    clientId: `writer-${index}`,
    sourceClientName: client === "Other Client" ? null : client,
    client: String(client),
    podName: "ROBISH",
    service: "PM",
    videos: 0,
    statics: Number(statics),
    writerIds: ["alphin"],
    writerNames: ["Alphin"],
    designerIds: ["akhil", "shwetha"],
    designerNames: ["Akhil", "Shwetha"],
    editorIds: [],
    editorNames: [],
  }))
);
const alphinItems = getEmployeePlannerItems("2026-06", "Alphin", "Content Writer", writerFairnessPods);
const writerDays = new Map<string, Map<string, number>>();

for (const item of alphinItems) {
  const count = [...item.task.matchAll(/(?:Script|Brief) (\d+)/g)].reduce(
    (total, match) => total + Number(match[1]),
    0
  );
  const clientCounts = writerDays.get(item.dateLabel) ?? new Map<string, number>();
  clientCounts.set(item.client, (clientCounts.get(item.client) ?? 0) + count);
  writerDays.set(item.dateLabel, clientCounts);
}

const writerDailyLoads = [...writerDays.entries()].map(([day, clients]) => ({
  day,
  clients: Object.fromEntries(clients),
  total: [...clients.values()].reduce((total, count) => total + count, 0),
}));
const result = {
  maxPerDay: Math.max(...allocations.map(([, count]) => count)),
  violations: allocations.filter(([, count]) => count > 6),
  allocations,
  hasKiaSummary: xml.includes("81 / 81"),
  multiRoleCoverage: {
    naveen: getEmployeePlannerItems("2026-06", "Naveen", "Content Writer", workbookPods).length,
    fathima: getEmployeePlannerItems("2026-06", "Fathima", "Content Writer", workbookPods).length,
    akhil: getEmployeePlannerItems("2026-06", "Akhil", "Designer", workbookPods).length,
    shwetha: getEmployeePlannerItems("2026-06", "Shwetha", "Designer", workbookPods).length,
    adithyan: getEmployeePlannerItems("2026-06", "Adithyan", "Editor", workbookPods).length,
    jabin: getEmployeePlannerItems("2026-06", "Jabin", "Editor", workbookPods).length,
  },
  dynamicMetadata:
    xml.includes("Writers: Fathima, Naveen") &&
    xml.includes("Designers: Akhil, Shwetha") &&
    !xml.includes("Naveen handles Kia"),
  writerFairness: {
    dailyLoads: writerDailyLoads,
    maxPerDay: Math.max(...writerDailyLoads.map((day) => day.total)),
    singleClientFullDays: writerDailyLoads.filter(
      (day) => day.total >= 6 && Object.keys(day.clients).length === 1
    ),
  },
};

console.log(JSON.stringify(result, null, 2));

if (
  result.violations.length > 0 ||
  !result.hasKiaSummary ||
  Object.values(result.multiRoleCoverage).some((count) => count === 0) ||
  !result.dynamicMetadata ||
  result.writerFairness.maxPerDay > 6 ||
  result.writerFairness.singleClientFullDays.length > 0
) {
  throw new Error("Production capacity regression detected.");
}
