import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  clientTeamMembers,
  clients,
  departments,
  productionPodNames,
  productionServiceLabels,
  productionWorkbookPlans,
  users,
  type ClientServiceType,
  type ClientTeamRole,
  type ProductionPodName,
  type ProductionServiceLabel,
} from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { canManagePlanner } from "@/server/auth/permissions";
import { db } from "@/server/db/client";
import { createId } from "@/server/ids";

type SavedWorkbookRow = {
  clientId?: string | null;
  clientName?: string;
  podName?: ProductionPodName;
  service?: ProductionServiceLabel;
  videos?: number;
  statics?: number;
  writerIds?: string[];
  designerIds?: string[];
  editorIds?: string[];
};

function nowIso() {
  return new Date().toISOString();
}

function numberOrZero(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function normalizedName(value: string) {
  return value.trim().toLocaleLowerCase();
}

function serviceTypeForWorkbook(service: ProductionServiceLabel): ClientServiceType {
  if (service === "PM") return "performance";
  if (service === "SM") return "social";
  return "both";
}

async function workbookPayload(monthKey: string) {
  const [planRows, clientRows, teamRows, userRows] = await Promise.all([
    db
      .select({
        id: productionWorkbookPlans.id,
        clientId: productionWorkbookPlans.clientId,
        clientName: clients.name,
        monthKey: productionWorkbookPlans.monthKey,
        podName: productionWorkbookPlans.podName,
        service: productionWorkbookPlans.serviceLabel,
        videos: productionWorkbookPlans.videoCount,
        statics: productionWorkbookPlans.staticCount,
      })
      .from(productionWorkbookPlans)
      .innerJoin(clients, eq(productionWorkbookPlans.clientId, clients.id))
      .where(eq(productionWorkbookPlans.monthKey, monthKey))
      .orderBy(asc(productionWorkbookPlans.podName), asc(clients.name)),
    db
      .select({
        id: clients.id,
        name: clients.name,
        isActive: clients.isActive,
      })
      .from(clients)
      .where(eq(clients.isActive, true))
      .orderBy(asc(clients.name)),
    db
      .select({
        clientId: clientTeamMembers.clientId,
        userId: clientTeamMembers.userId,
        teamRole: clientTeamMembers.teamRole,
        userName: users.name,
      })
      .from(clientTeamMembers)
      .innerJoin(users, eq(clientTeamMembers.userId, users.id))
      .where(eq(users.isActive, true))
      .orderBy(asc(users.name)),
    db
      .select({
        id: users.id,
        name: users.name,
        departmentName: departments.name,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(eq(users.isActive, true))
      .orderBy(asc(users.name)),
  ]);

  return {
    monthKey,
    plans: planRows.map((plan) => ({
      ...plan,
      writerIds: teamRows
        .filter((member) => member.clientId === plan.clientId && member.teamRole === "writer")
        .map((member) => member.userId),
      writerNames: teamRows
        .filter((member) => member.clientId === plan.clientId && member.teamRole === "writer")
        .map((member) => member.userName),
      designerIds: teamRows
        .filter((member) => member.clientId === plan.clientId && member.teamRole === "designer")
        .map((member) => member.userId),
      designerNames: teamRows
        .filter((member) => member.clientId === plan.clientId && member.teamRole === "designer")
        .map((member) => member.userName),
      editorIds: teamRows
        .filter((member) => member.clientId === plan.clientId && member.teamRole === "editor")
        .map((member) => member.userId),
      editorNames: teamRows
        .filter((member) => member.clientId === plan.clientId && member.teamRole === "editor")
        .map((member) => member.userName),
    })),
    clients: clientRows,
    teamMembers: teamRows,
    users: userRows,
  };
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const monthKey = new URL(request.url).searchParams.get("monthKey")?.trim() ?? "";
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    return NextResponse.json({ error: "A valid month is required." }, { status: 400 });
  }

  return NextResponse.json(await workbookPayload(monthKey));
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !canManagePlanner(currentUser)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    monthKey?: string;
    rows?: SavedWorkbookRow[];
  } | null;
  const monthKey = body?.monthKey?.trim() ?? "";

  if (!/^\d{4}-\d{2}$/.test(monthKey) || !Array.isArray(body?.rows)) {
    return NextResponse.json({ error: "Month and workbook rows are required." }, { status: 400 });
  }

  const rows = body.rows.filter((row) => row.clientName?.trim());
  for (const row of rows) {
    if (!row.podName || !productionPodNames.includes(row.podName)) {
      return NextResponse.json({ error: `Invalid pod for ${row.clientName}.` }, { status: 400 });
    }
    if (!row.service || !productionServiceLabels.includes(row.service)) {
      return NextResponse.json({ error: `Invalid service for ${row.clientName}.` }, { status: 400 });
    }
  }

  const [existingClients, existingPlans, activeUsers] = await Promise.all([
    db.select({ id: clients.id, name: clients.name }).from(clients),
    db
      .select({ id: productionWorkbookPlans.id, clientId: productionWorkbookPlans.clientId })
      .from(productionWorkbookPlans)
      .where(eq(productionWorkbookPlans.monthKey, monthKey)),
    db.select({ id: users.id }).from(users).where(eq(users.isActive, true)),
  ]);
  const clientsById = new Map(existingClients.map((client) => [client.id, client]));
  const clientsByName = new Map(existingClients.map((client) => [normalizedName(client.name), client]));
  const plansByClientId = new Map(existingPlans.map((plan) => [plan.clientId, plan]));
  const validUserIds = new Set(activeUsers.map((user) => user.id));
  const savedClientIds = new Set<string>();
  const now = nowIso();

  await db.transaction(async (tx) => {
    for (const row of rows) {
      const clientName = row.clientName?.trim() ?? "";
      let client = (row.clientId ? clientsById.get(row.clientId) : null) ?? clientsByName.get(normalizedName(clientName));

      if (!client) {
        client = { id: createId(), name: clientName };
        await tx.insert(clients).values({
          id: client.id,
          name: clientName,
          serviceType: serviceTypeForWorkbook(row.service as ProductionServiceLabel),
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        clientsById.set(client.id, client);
        clientsByName.set(normalizedName(clientName), client);
      } else {
        await tx
          .update(clients)
          .set({
            name: clientName,
            serviceType: serviceTypeForWorkbook(row.service as ProductionServiceLabel),
            isActive: true,
            updatedAt: now,
          })
          .where(eq(clients.id, client.id));
      }

      savedClientIds.add(client.id);
      const existingPlan = plansByClientId.get(client.id);
      const planValues = {
        podName: row.podName as ProductionPodName,
        serviceLabel: row.service as ProductionServiceLabel,
        videoCount: numberOrZero(row.videos),
        staticCount: numberOrZero(row.statics),
        updatedAt: now,
      };

      if (existingPlan) {
        await tx.update(productionWorkbookPlans).set(planValues).where(eq(productionWorkbookPlans.id, existingPlan.id));
      } else {
        const planId = createId();
        await tx.insert(productionWorkbookPlans).values({
          id: planId,
          clientId: client.id,
          monthKey,
          ...planValues,
          createdByUserId: currentUser.userId,
          createdAt: now,
        });
        plansByClientId.set(client.id, { id: planId, clientId: client.id });
      }

      await tx.delete(clientTeamMembers).where(eq(clientTeamMembers.clientId, client.id));
      const roleInputs: Array<[ClientTeamRole, string[]]> = [
        ["writer", row.writerIds ?? []],
        ["designer", row.designerIds ?? []],
        ["editor", row.editorIds ?? []],
      ];
      const membershipRows = roleInputs.flatMap(([teamRole, userIds]) =>
        [...new Set(userIds)]
          .filter((userId) => validUserIds.has(userId))
          .map((userId) => ({
            id: createId(),
            clientId: client.id,
            userId,
            teamRole,
            createdAt: now,
          }))
      );
      if (membershipRows.length > 0) {
        await tx.insert(clientTeamMembers).values(membershipRows);
      }
    }

    for (const existingPlan of existingPlans) {
      if (!savedClientIds.has(existingPlan.clientId)) {
        await tx
          .delete(productionWorkbookPlans)
          .where(
            and(
              eq(productionWorkbookPlans.id, existingPlan.id),
              eq(productionWorkbookPlans.monthKey, monthKey)
            )
          );
      }
    }
  });

  return NextResponse.json({ ok: true, ...(await workbookPayload(monthKey)) });
}
