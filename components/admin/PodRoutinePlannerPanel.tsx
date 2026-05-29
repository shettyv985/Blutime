"use client";

import { useMemo, useState } from "react";

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

type BufferRow = {
  client: string;
  service: string;
  condition: string;
  action: string;
  who: string;
  output: string;
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
      Writers: "Durga, Fathima, Naveen — 6 tasks/week each",
      Designers: "Shwetha, Akhil — 4–5 tasks/week each (5 statics/day, 3 carousels/day)",
      Editor: "Adithyan — 3 videos/day",
    },
    clients: [
      ["Abad", "PM+SM", "Durga/Fathima", "Shwetha", "Adithyan", 15, 12, "SM: +3 branding vids"],
      ["Activbase", "PM", "Fathima", "Akhil", "Adithyan", 5, 10, "cross-pod writer"],
      ["Kia", "PM+SM", "Naveen", "Akhil", "Adithyan", 12, 10, "SM: +4 statics +4 branding vids"],
      ["Mother's Food", "PM", "Naveen", "Shwetha", "Adithyan", 5, 10, ""],
      ["Memory Train", "PM", "Naveen", "Akhil", "Adithyan", 5, 10, ""],
      ["Pawan", "PM+SM", "Naveen", "Akhil", "Adithyan", 12, 10, "SM: +10 statics +5 branding vids"],
      ["Heal in Kerala", "PM", "Fathima", "Shwetha", "Adithyan", 12, 10, "cross-pod writer"],
    ],
    flags: [
      "⚠️ Naveen handles Kia, Mother's Food, Memory Train, Pawan — 4 clients. Monitor weekly load carefully.",
      "⚠️ Friday shoot shared with Reshma pod — max 2–3 reels total, split equally (~1–2 each pod).",
    ],
  },
  RELSA: {
    shoot_days: { Wed: "full", Thu: "full" },
    capacity: {
      Writers: "Rohith, Aswathy, Aswathy Manoj, Alphin, Fathima — 6 tasks/week each",
      Designers: "Anandu KR, Lekshmi — 4–5 tasks/week each",
      Editors: "Bibin, Jabin — 3 videos/day each",
    },
    clients: [
      ["Chakolas", "PM+SM", "Rohith (cross)", "Anandu KR (cross)", "Bibin", 15, 12, "SM: +3 branding vids"],
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
      "ℹ️ AI videos (Blusteak, Blucampus): Writer→Editor direct, no production shoot needed.",
    ],
  },
  RESHMA: {
    shoot_days: { Mon: "full", Fri: "half" },
    capacity: {
      Writers: "Durga, Alphin, Rohith (all cross-pod) — 6 tasks/week each",
      Designers: "Anandhu Shaji, Abhijith MS, Anandu KR (cross) — 4–5 tasks/week each",
      Editors: "Jabin, Anu Rose — 3 videos/day each",
    },
    clients: [
      ["Zeiq", "PM+SM", "Durga (cross)", "Anandhu Shaji", "Jabin/Anu Rose", 15, 12, "SM: +3 branding vids"],
      ["Halwa", "PM+SM", "Alphin (cross)", "Abhijith MS", "Jabin/Anu Rose", 15, 10, "SM: +5 branding vids"],
      ["Spaces Eco", "PM+SM", "Alphin (cross)", "Abhijith MS", "Jabin/Anu Rose", 15, 10, "SM: +5 branding vids"],
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
  ["AI Video flow", "Writer scripts (Day 1) → Editor: AI gen + edit (Day 2–3, runs alongside other edits)"],
  ["Priority client approval", "Same day — flow continues next day"],
  ["Normal client approval", "1 day buffer built into flow"],
  ["", null],
  ["PRODUCTION CAPACITY", null],
  ["Full shoot day", "4–5 reels max"],
  ["Half shoot day (Fri / odd Sat)", "2–3 reels max"],
  ["Friday shared (Robish + Reshma)", "2–3 reels total split equally ~1–2 reels each pod"],
  ["", null],
  ["TEAM CAPACITY (per week)", null],
  ["Writers", "6 tasks each per week"],
  ["Designers", "4–5 tasks each per week | 5 statics/day | 3 carousels/day"],
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
  return value === "—" || value === "TBD";
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

function buildRoleRows(podData: PodData, week: WeekBlock, weekIndex: number, client: PodClient) {
  const [cname, ctype, writer, designer, editor, vids, statics, note] = client;
  const isAi = note.includes("AI");
  const wVids = vids > 0 ? split3(vids)[weekIndex] : 0;
  const wStatics = statics > 0 ? split3(statics)[weekIndex] : 0;
  const dayKeys = week.days.map((day) => day.label);
  const shootDaysThisWeek = week.days
    .filter((day) => Object.keys(podData.shoot_days).some((shootDay) => day.label.includes(shootDay)) && day.type !== "off")
    .map((day) => day.label);
  const rows: RoleRow[] = [];

  if (!isMissingPerson(writer)) {
    const tasks: Record<string, string> = {};
    if (wVids > 0 && !isAi) tasks[dayKeys[0]] = `Script ${wVids} reel(s)\n[${cname}] incl. hooks`;
    if (wVids > 0 && isAi) tasks[dayKeys[0]] = `Script ${wVids} AI vid(s)\n[${cname}]`;
    if (wStatics > 0) {
      const staticDay = wVids > 0 ? dayKeys[1] : dayKeys[0];
      tasks[staticDay] = [tasks[staticDay], `Brief ${wStatics} static(s)\n[${cname}]`].filter(Boolean).join("\n");
    }
    rows.push({
      client: cname,
      service: ctype,
      role: "Writer",
      person: writer,
      tasks,
      weeklyOut: wVids + wStatics,
      note,
      isFirst: true,
      ...roleColors("Writer"),
    });
  }

  if (wVids > 0 && !isAi) {
    const tasks: Record<string, string> = {};
    for (const shootDay of shootDaysThisWeek.slice(0, 2)) {
      const cap = week.days.find((day) => day.label === shootDay)?.type === "full" ? "4–5 reels" : "2–3 reels";
      tasks[shootDay] = `SHOOT ${wVids} reel(s)\n[${cname}]\nCap: ${cap}`;
    }
    rows.push({
      client: cname,
      service: ctype,
      role: "Production",
      person: "Crew",
      tasks,
      weeklyOut: wVids + wStatics,
      note,
      isFirst: rows.length === 0,
      ...roleColors("Production"),
    });
  }

  if (!isMissingPerson(designer) && wStatics > 0) {
    const designDay = wVids > 0 ? dayKeys[2] : dayKeys[1];
    rows.push({
      client: cname,
      service: ctype,
      role: "Designer",
      person: designer,
      tasks: { [designDay]: `Design ${wStatics} static(s)\n[${cname}]\n${designer}` },
      weeklyOut: wVids + wStatics,
      note,
      isFirst: rows.length === 0,
      ...roleColors("Designer"),
    });
  }

  if (!isMissingPerson(editor) && wVids > 0) {
    const tasks: Record<string, string> = {};
    if (isAi) {
      tasks[dayKeys[1]] = `AI gen + edit\n${wVids} vid(s)\n[${cname}]`;
      tasks[dayKeys[2]] = `Finalise AI vids\n[${cname}] — deliver`;
    } else {
      for (const shootDay of shootDaysThisWeek.slice(0, 1)) {
        const shootIndex = dayKeys.indexOf(shootDay);
        const editDay = dayKeys[Math.min(shootIndex + 1, dayKeys.length - 1)];
        tasks[editDay] = `Edit ${wVids} video(s)\n[${cname}]\nDeliver EOD`;
      }
    }
    rows.push({
      client: cname,
      service: ctype,
      role: "Editor",
      person: editor,
      tasks,
      weeklyOut: wVids + wStatics,
      note,
      isFirst: rows.length === 0,
      ...roleColors("Editor"),
    });
  }

  return rows;
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

function podRowsXmlRows(podName: keyof typeof pods, podData: PodData, weeks: WeekBlock[], monthLabel: string) {
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

    if (week.isBuffer) {
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
      const roleRows = buildRoleRows(podData, week, weekIndex, client);
      if (roleRows.length === 0) {
        rows.push({ height: 16, cells: [{ value: `${client[0]} (${client[1]}) — TBD | ${client[7]}`, style: "Off", mergeAcross: 13 }] });
        continue;
      }

      roleRows.forEach((roleRow, rowIndex) => {
        const first = rowIndex === 0;
        rows.push({
          height: 44,
          cells: [
            { value: first ? roleRow.client : "", style: first ? "DefaultCell" : "Blank" },
            { value: first ? roleRow.service : "", style: first ? "DefaultCell" : "Blank" },
            { value: roleRow.role, style: roleStyle(roleRow.role) },
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

  return rows;
}

function buildWorkbookXml(monthKey: string) {
  const weeks = buildWeeks(monthKey);
  const monthLabel = formatMonthLabel(monthKey);
  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>${workbookStylesXml().replace("<Styles>", "").replace("</Styles>", "")}${swatchStylesXml()}</Styles>
  ${worksheetXml("LEGEND & RULES", legendRowsXmlRows(), [28, 60])}
  ${(Object.keys(pods) as Array<keyof typeof pods>).map((podName) => worksheetXml(podName, podRowsXmlRows(podName, pods[podName], weeks, monthLabel), [18, 8, 14, 16, 16, 16, 16, 16, 16, 12, 14, 14, 14, 14])).join("")}
</Workbook>`;

  return workbook;
}

function downloadWorkbook(monthKey: string) {
  const blob = new Blob([buildWorkbookXml(monthKey)], { type: "application/vnd.ms-excel;charset=utf-8" });
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
  const weeks = useMemo(() => buildWeeks(monthKey), [monthKey]);

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
            onClick={() => downloadWorkbook(monthKey)}
            className="border border-[var(--border-strong)] px-5 py-3 text-base"
          >
            Download Excel
          </button>
        </div>
      </div>

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
          <PodSheet podName={activeSheet} podData={pods[activeSheet]} weeks={weeks} monthLabel={formatMonthLabel(monthKey)} />
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
  monthLabel,
  podData,
  podName,
  weeks,
}: {
  monthLabel: string;
  podData: PodData;
  podName: keyof typeof pods;
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
        {weeks.map((week, index) =>
          week.isBuffer ? (
            <BufferWeek key={week.key} podData={podData} week={week} />
          ) : (
            <WorkingWeek key={week.key} podData={podData} week={week} weekIndex={index} />
          )
        )}
      </div>
    </section>
  );
}

function WorkingWeek({ podData, week, weekIndex }: { podData: PodData; week: WeekBlock; weekIndex: number }) {
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
                const rows = buildRoleRows(podData, week, weekIndex, client);
                if (rows.length === 0) {
                  return (
                    <tr key={`${week.key}-${client[0]}-tbd`}>
                      <td colSpan={week.days.length + 5} className="excel-off-cell">{client[0]} ({client[1]}) — TBD | {client[7]}</td>
                    </tr>
                  );
                }

                return rows.map((row, rowIndex) => {
                  const first = rowIndex === 0;
                  return (
                    <tr key={`${week.key}-${row.client}-${row.role}`}>
                      <td className={first ? "excel-client-cell" : "excel-muted-cell"}>{first ? row.client : ""}</td>
                      <td className={first ? "" : "excel-muted-cell"}>{first ? row.service : ""}</td>
                      <td className={`excel-role-cell excel-role-${row.role.toLowerCase()}`}>{row.role}</td>
                      {week.days.map((day) => {
                        const task = row.tasks[day.label] ?? "";
                        return (
                          <td
                            key={day.label}
                            className={day.type === "off" ? "excel-off-cell" : task ? `excel-task-cell excel-task-${row.role.toLowerCase()}` : day.type === "half" ? "excel-half-cell" : "excel-blank-cell"}
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
