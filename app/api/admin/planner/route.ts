import { and, asc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  clientServiceTypes,
  clientTeamMembers,
  clientTeamRoles,
  clients,
  departments,
  monthlyPlanDeliverables,
  monthlyPlans,
  plannerAssignments,
  plannerDeliverableTypes,
  type ClientServiceType,
  type ClientTeamRole,
  type NewClientTeamMember,
  type PlannerDeliverableType,
  type PlannerServiceLine,
  users,
} from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { canManagePlanner } from "@/server/auth/permissions";
import { getBasecampProjects } from "@/server/basecamp/client";
import { db } from "@/server/db/client";
import { createId } from "@/server/ids";

type ClientCounts = {
  static: number;
  carousel: number;
  reelEdit: number;
  aiVideo: number;
};

type NormalizedClientCounts = Record<PlannerDeliverableType, number>;

type MonthlyPlanInput = {
  clientId?: string;
  monthKey?: string;
  social?: Partial<ClientCounts>;
  performance?: Partial<ClientCounts>;
};

const deliverableLabels: Record<PlannerDeliverableType, string> = {
  static: "Static",
  carousel: "Carousel",
  reel_edit: "Reel edit",
  ai_video: "AI video",
};

function nowIso() {
  return new Date().toISOString();
}

function numberOrZero(value: unknown) {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue) || numberValue < 0) return 0;
  return Math.floor(numberValue);
}

function defaultCountsForServiceType(serviceType: ClientServiceType) {
  return {
    social:
      serviceType === "social" || serviceType === "both"
        ? { static: 10, carousel: 0, reel_edit: 5, ai_video: 0 }
        : { static: 0, carousel: 0, reel_edit: 0, ai_video: 0 },
    performance:
      serviceType === "performance" || serviceType === "both"
        ? { static: 10, carousel: 0, reel_edit: 5, ai_video: 0 }
        : { static: 0, carousel: 0, reel_edit: 0, ai_video: 0 },
  };
}

function sanitizeCountsForServiceType(
  serviceType: ClientServiceType,
  socialCounts: NormalizedClientCounts,
  performanceCounts: NormalizedClientCounts
) {
  const zeroCounts = { static: 0, carousel: 0, reel_edit: 0, ai_video: 0 };

  if (serviceType === "social") {
    return { social: socialCounts, performance: zeroCounts };
  }

  if (serviceType === "performance") {
    return { social: zeroCounts, performance: performanceCounts };
  }

  if (serviceType === "both") {
    return { social: socialCounts, performance: performanceCounts };
  }

  return { social: zeroCounts, performance: zeroCounts };
}

function countsChanged(
  existingPlan: {
    socialStaticCount: number;
    socialCarouselCount: number;
    socialReelEditCount: number;
    socialAiVideoCount: number;
    performanceStaticCount: number;
    performanceCarouselCount: number;
    performanceReelEditCount: number;
    performanceAiVideoCount: number;
  } | null | undefined,
  socialCounts: NormalizedClientCounts,
  performanceCounts: NormalizedClientCounts
) {
  return (
    !existingPlan ||
    existingPlan.socialStaticCount !== socialCounts.static ||
    existingPlan.socialCarouselCount !== socialCounts.carousel ||
    existingPlan.socialReelEditCount !== socialCounts.reel_edit ||
    existingPlan.socialAiVideoCount !== socialCounts.ai_video ||
    existingPlan.performanceStaticCount !== performanceCounts.static ||
    existingPlan.performanceCarouselCount !== performanceCounts.carousel ||
    existingPlan.performanceReelEditCount !== performanceCounts.reel_edit ||
    existingPlan.performanceAiVideoCount !== performanceCounts.ai_video
  );
}

function assertPlannerAccess(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  return Boolean(user && canManagePlanner(user));
}

function makeDeliverables(
  planId: string,
  serviceLine: PlannerServiceLine,
  counts: Record<PlannerDeliverableType, number>
) {
  const rows = [];

  for (const deliverableType of plannerDeliverableTypes) {
    for (let sequence = 1; sequence <= counts[deliverableType]; sequence += 1) {
      rows.push({
        id: createId(),
        monthlyPlanId: planId,
        serviceLine,
        deliverableType,
        sequence,
        title: `${serviceLine === "social" ? "Social" : "Performance"} ${deliverableLabels[deliverableType]} ${sequence}`,
        shootRequired: deliverableType === "reel_edit" ? false : null,
        createdAt: nowIso(),
      });
    }
  }

  return rows;
}

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!assertPlannerAccess(currentUser)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const [clientRows, teamRows, userRows, planRows, deliverableRows, assignmentRows] = await Promise.all([
    db
      .select({
        id: clients.id,
        name: clients.name,
        basecampProjectId: clients.basecampProjectId,
        basecampProjectUrl: clients.basecampProjectUrl,
        serviceType: clients.serviceType,
        leadUserId: clients.leadUserId,
        accountManagerUserId: clients.accountManagerUserId,
        leadName: users.name,
        isActive: clients.isActive,
      })
      .from(clients)
      .leftJoin(users, eq(clients.leadUserId, users.id))
      .orderBy(asc(clients.name)),
    db
      .select({
        id: clientTeamMembers.id,
        clientId: clientTeamMembers.clientId,
        userId: clientTeamMembers.userId,
        teamRole: clientTeamMembers.teamRole,
        userName: users.name,
      })
      .from(clientTeamMembers)
      .innerJoin(users, eq(clientTeamMembers.userId, users.id))
      .orderBy(asc(users.name)),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        accessRole: users.accessRole,
        departmentName: departments.name,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(eq(users.isActive, true))
      .orderBy(asc(users.name)),
    db
      .select({
        id: monthlyPlans.id,
        clientId: monthlyPlans.clientId,
        clientName: clients.name,
        monthKey: monthlyPlans.monthKey,
        socialStaticCount: monthlyPlans.socialStaticCount,
        socialCarouselCount: monthlyPlans.socialCarouselCount,
        socialReelEditCount: monthlyPlans.socialReelEditCount,
        socialAiVideoCount: monthlyPlans.socialAiVideoCount,
        performanceStaticCount: monthlyPlans.performanceStaticCount,
        performanceCarouselCount: monthlyPlans.performanceCarouselCount,
        performanceReelEditCount: monthlyPlans.performanceReelEditCount,
        performanceAiVideoCount: monthlyPlans.performanceAiVideoCount,
        updatedAt: monthlyPlans.updatedAt,
      })
      .from(monthlyPlans)
      .innerJoin(clients, eq(monthlyPlans.clientId, clients.id))
      .orderBy(asc(monthlyPlans.monthKey), asc(clients.name)),
    db
      .select({
        id: monthlyPlanDeliverables.id,
        monthlyPlanId: monthlyPlanDeliverables.monthlyPlanId,
        serviceLine: monthlyPlanDeliverables.serviceLine,
        deliverableType: monthlyPlanDeliverables.deliverableType,
        sequence: monthlyPlanDeliverables.sequence,
        title: monthlyPlanDeliverables.title,
        shootRequired: monthlyPlanDeliverables.shootRequired,
      })
      .from(monthlyPlanDeliverables)
      .orderBy(
        asc(monthlyPlanDeliverables.serviceLine),
        asc(monthlyPlanDeliverables.deliverableType),
        asc(monthlyPlanDeliverables.sequence)
      ),
    db
      .select({
        id: plannerAssignments.id,
        deliverableId: plannerAssignments.deliverableId,
        status: plannerAssignments.status,
        plannedWeek: plannerAssignments.plannedWeek,
        writerUserId: plannerAssignments.writerUserId,
        writerDate: plannerAssignments.writerDate,
        writerCompletedAt: plannerAssignments.writerCompletedAt,
        designerUserId: plannerAssignments.designerUserId,
        designerDate: plannerAssignments.designerDate,
        designerCompletedAt: plannerAssignments.designerCompletedAt,
        productionUserId: plannerAssignments.productionUserId,
        productionDate: plannerAssignments.productionDate,
        productionCompletedAt: plannerAssignments.productionCompletedAt,
        editorUserId: plannerAssignments.editorUserId,
        editorDate: plannerAssignments.editorDate,
        editorCompletedAt: plannerAssignments.editorCompletedAt,
        completedAt: plannerAssignments.completedAt,
        basecampTaskUrl: plannerAssignments.basecampTaskUrl,
        basecampTaskTitle: plannerAssignments.basecampTaskTitle,
      })
      .from(plannerAssignments)
      .orderBy(asc(plannerAssignments.plannedWeek)),
  ]);

  return NextResponse.json({
    clients: clientRows,
    teamMembers: teamRows,
    users: userRows,
    monthlyPlans: planRows,
    deliverables: deliverableRows,
    assignments: assignmentRows,
  });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!assertPlannerAccess(currentUser)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?: string;
    plan?: MonthlyPlanInput;
    leadUserId?: string | null;
    monthKey?: string;
  } | null;

  if (body?.action === "syncClients") {
    const projects = await getBasecampProjects();
    const now = nowIso();
    let created = 0;
    let updated = 0;

    for (const project of projects) {
      const projectId = String(project.id);
      const [existing] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.basecampProjectId, projectId))
        .limit(1);

      if (existing) {
        await db
          .update(clients)
          .set({
            name: project.name,
            basecampProjectUrl: project.app_url ?? project.url ?? null,
            updatedAt: now,
          })
          .where(eq(clients.id, existing.id));
        updated += 1;
        continue;
      }

      await db.insert(clients).values({
        id: createId(),
        name: project.name,
        basecampProjectId: projectId,
        basecampProjectUrl: project.app_url ?? project.url ?? null,
        serviceType: "unset",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      created += 1;
    }

    return NextResponse.json({ ok: true, created, updated });
  }

  if (body?.action === "saveMonthlyPlan") {
    const plan = body.plan;
    const clientId = plan?.clientId?.trim();
    const monthKey = plan?.monthKey?.trim();

    if (!clientId || !monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
      return NextResponse.json({ error: "Client and month are required." }, { status: 400 });
    }

    const now = nowIso();
    const inputSocialCounts = {
      static: numberOrZero(plan?.social?.static ?? 10),
      carousel: numberOrZero(plan?.social?.carousel),
      reel_edit: numberOrZero(plan?.social?.reelEdit ?? 5),
      ai_video: numberOrZero(plan?.social?.aiVideo),
    };
    const inputPerformanceCounts = {
      static: numberOrZero(plan?.performance?.static ?? 10),
      carousel: numberOrZero(plan?.performance?.carousel),
      reel_edit: numberOrZero(plan?.performance?.reelEdit ?? 5),
      ai_video: numberOrZero(plan?.performance?.aiVideo),
    };
    const [selectedClient] = await db
      .select({ serviceType: clients.serviceType })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!selectedClient) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    const { social: socialCounts, performance: performanceCounts } = sanitizeCountsForServiceType(
      selectedClient.serviceType,
      inputSocialCounts,
      inputPerformanceCounts
    );

    const [existingPlan] = await db
      .select({
        id: monthlyPlans.id,
        socialStaticCount: monthlyPlans.socialStaticCount,
        socialCarouselCount: monthlyPlans.socialCarouselCount,
        socialReelEditCount: monthlyPlans.socialReelEditCount,
        socialAiVideoCount: monthlyPlans.socialAiVideoCount,
        performanceStaticCount: monthlyPlans.performanceStaticCount,
        performanceCarouselCount: monthlyPlans.performanceCarouselCount,
        performanceReelEditCount: monthlyPlans.performanceReelEditCount,
        performanceAiVideoCount: monthlyPlans.performanceAiVideoCount,
      })
      .from(monthlyPlans)
      .where(and(eq(monthlyPlans.clientId, clientId), eq(monthlyPlans.monthKey, monthKey)))
      .limit(1);

    const planId = existingPlan?.id ?? createId();
    const shouldRegenerate = countsChanged(existingPlan, socialCounts, performanceCounts);

    await db.transaction(async (tx) => {
      if (existingPlan) {
        await tx
          .update(monthlyPlans)
          .set({
            socialStaticCount: socialCounts.static,
            socialCarouselCount: socialCounts.carousel,
            socialReelEditCount: socialCounts.reel_edit,
            socialAiVideoCount: socialCounts.ai_video,
            performanceStaticCount: performanceCounts.static,
            performanceCarouselCount: performanceCounts.carousel,
            performanceReelEditCount: performanceCounts.reel_edit,
            performanceAiVideoCount: performanceCounts.ai_video,
            updatedAt: now,
          })
          .where(eq(monthlyPlans.id, planId));
      } else {
        await tx.insert(monthlyPlans).values({
          id: planId,
          clientId,
          monthKey,
          socialStaticCount: socialCounts.static,
          socialCarouselCount: socialCounts.carousel,
          socialReelEditCount: socialCounts.reel_edit,
          socialAiVideoCount: socialCounts.ai_video,
          performanceStaticCount: performanceCounts.static,
          performanceCarouselCount: performanceCounts.carousel,
          performanceReelEditCount: performanceCounts.reel_edit,
          performanceAiVideoCount: performanceCounts.ai_video,
          createdByUserId: currentUser?.userId,
          createdAt: now,
          updatedAt: now,
        });
      }

      if (!shouldRegenerate) return;

      const oldDeliverables = await tx
        .select({ id: monthlyPlanDeliverables.id })
        .from(monthlyPlanDeliverables)
        .where(eq(monthlyPlanDeliverables.monthlyPlanId, planId));

      if (oldDeliverables.length > 0) {
        await tx
          .delete(plannerAssignments)
          .where(inArray(plannerAssignments.deliverableId, oldDeliverables.map((deliverable) => deliverable.id)));
      }

      await tx.delete(monthlyPlanDeliverables).where(eq(monthlyPlanDeliverables.monthlyPlanId, planId));

      const deliverables = [
        ...makeDeliverables(planId, "social", socialCounts),
        ...makeDeliverables(planId, "performance", performanceCounts),
      ];

      if (deliverables.length > 0) {
        await tx.insert(monthlyPlanDeliverables).values(deliverables);
      }
    });

    return NextResponse.json({ ok: true, planId, regenerated: shouldRegenerate });
  }

  if (body?.action === "saveLeadMonthlyPlans") {
    const leadUserId = body.leadUserId?.trim();
    const monthKey = body.monthKey?.trim();

    if (!leadUserId || !monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
      return NextResponse.json({ error: "Lead and month are required." }, { status: 400 });
    }

    const leadClients = await db
      .select({
        id: clients.id,
        serviceType: clients.serviceType,
      })
      .from(clients)
      .where(and(eq(clients.isActive, true), eq(clients.leadUserId, leadUserId)));

    const existingPlans = leadClients.length
      ? await db
          .select({
            id: monthlyPlans.id,
            clientId: monthlyPlans.clientId,
            socialStaticCount: monthlyPlans.socialStaticCount,
            socialCarouselCount: monthlyPlans.socialCarouselCount,
            socialReelEditCount: monthlyPlans.socialReelEditCount,
            socialAiVideoCount: monthlyPlans.socialAiVideoCount,
            performanceStaticCount: monthlyPlans.performanceStaticCount,
            performanceCarouselCount: monthlyPlans.performanceCarouselCount,
            performanceReelEditCount: monthlyPlans.performanceReelEditCount,
            performanceAiVideoCount: monthlyPlans.performanceAiVideoCount,
          })
          .from(monthlyPlans)
          .where(and(eq(monthlyPlans.monthKey, monthKey), inArray(monthlyPlans.clientId, leadClients.map((client) => client.id))))
      : [];
    const existingPlansByClientId = new Map(existingPlans.map((plan) => [plan.clientId, plan]));
    const now = nowIso();
    let created = 0;
    let updated = 0;
    let skipped = 0;

    await db.transaction(async (tx) => {
      for (const client of leadClients) {
        const existingPlan = existingPlansByClientId.get(client.id);
        const fallbackCounts = defaultCountsForServiceType(client.serviceType);
        const currentSocialCounts = existingPlan
          ? {
              static: existingPlan.socialStaticCount,
              carousel: existingPlan.socialCarouselCount,
              reel_edit: existingPlan.socialReelEditCount,
              ai_video: existingPlan.socialAiVideoCount,
            }
          : fallbackCounts.social;
        const currentPerformanceCounts = existingPlan
          ? {
              static: existingPlan.performanceStaticCount,
              carousel: existingPlan.performanceCarouselCount,
              reel_edit: existingPlan.performanceReelEditCount,
              ai_video: existingPlan.performanceAiVideoCount,
            }
          : fallbackCounts.performance;
        const counts = sanitizeCountsForServiceType(client.serviceType, currentSocialCounts, currentPerformanceCounts);
        const planId = existingPlan?.id ?? createId();
        const shouldRegenerate = countsChanged(existingPlan, counts.social, counts.performance);

        if (existingPlan && !shouldRegenerate) {
          skipped += 1;
          continue;
        }

        if (existingPlan) {
          await tx
            .update(monthlyPlans)
            .set({
              socialStaticCount: counts.social.static,
              socialCarouselCount: counts.social.carousel,
              socialReelEditCount: counts.social.reel_edit,
              socialAiVideoCount: counts.social.ai_video,
              performanceStaticCount: counts.performance.static,
              performanceCarouselCount: counts.performance.carousel,
              performanceReelEditCount: counts.performance.reel_edit,
              performanceAiVideoCount: counts.performance.ai_video,
              updatedAt: now,
            })
            .where(eq(monthlyPlans.id, planId));

          const oldDeliverables = await tx
            .select({ id: monthlyPlanDeliverables.id })
            .from(monthlyPlanDeliverables)
            .where(eq(monthlyPlanDeliverables.monthlyPlanId, planId));

          if (oldDeliverables.length > 0) {
            await tx
              .delete(plannerAssignments)
              .where(inArray(plannerAssignments.deliverableId, oldDeliverables.map((deliverable) => deliverable.id)));
          }

          await tx.delete(monthlyPlanDeliverables).where(eq(monthlyPlanDeliverables.monthlyPlanId, planId));
          updated += 1;
        } else {
          await tx.insert(monthlyPlans).values({
            id: planId,
            clientId: client.id,
            monthKey,
            socialStaticCount: counts.social.static,
            socialCarouselCount: counts.social.carousel,
            socialReelEditCount: counts.social.reel_edit,
            socialAiVideoCount: counts.social.ai_video,
            performanceStaticCount: counts.performance.static,
            performanceCarouselCount: counts.performance.carousel,
            performanceReelEditCount: counts.performance.reel_edit,
            performanceAiVideoCount: counts.performance.ai_video,
            createdByUserId: currentUser?.userId,
            createdAt: now,
            updatedAt: now,
          });
          created += 1;
        }

        const deliverables = [
          ...makeDeliverables(planId, "social", counts.social),
          ...makeDeliverables(planId, "performance", counts.performance),
        ];

        if (deliverables.length > 0) {
          await tx.insert(monthlyPlanDeliverables).values(deliverables);
        }

      }
    });

    return NextResponse.json({ ok: true, created, updated, skipped, clientCount: leadClients.length });
  }

  return NextResponse.json({ error: "Invalid planner action." }, { status: 400 });
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();

  if (!assertPlannerAccess(currentUser)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?: string;
    clientId?: string;
    name?: string;
    serviceType?: ClientServiceType;
    leadUserId?: string | null;
    accountManagerUserId?: string | null;
    isActive?: boolean;
    writerIds?: string[];
    designerIds?: string[];
    editorIds?: string[];
  } | null;

  const clientId = body?.clientId?.trim();

  if (!clientId) {
    return NextResponse.json({ error: "Client is required." }, { status: 400 });
  }

  if (body?.action === "updateClient") {
    const serviceType = body.serviceType ?? "unset";

    if (!clientServiceTypes.includes(serviceType)) {
      return NextResponse.json({ error: "Invalid client type." }, { status: 400 });
    }

    let leadUserId = body.leadUserId?.trim() || null;

    if (serviceType === "seo" || serviceType === "website") {
      const [ajin] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, "ajin@blusteak.com"))
        .limit(1);
      leadUserId = ajin?.id ?? leadUserId;
    }

    await db
      .update(clients)
      .set({
        name: body.name?.trim() || undefined,
        serviceType,
        leadUserId,
        accountManagerUserId: body.accountManagerUserId?.trim() || null,
        isActive: body.isActive ?? true,
        updatedAt: nowIso(),
      })
      .where(eq(clients.id, clientId));

    return NextResponse.json({ ok: true });
  }

  if (body?.action === "saveTeam") {
    const rows: NewClientTeamMember[] = [];
    const roleInputs: Array<[ClientTeamRole, string[] | undefined]> = [
      ["writer", body.writerIds],
      ["designer", body.designerIds],
      ["editor", body.editorIds],
    ];

    for (const [teamRole, userIds] of roleInputs) {
      if (!clientTeamRoles.includes(teamRole)) continue;
      for (const userId of userIds ?? []) {
        if (!userId) continue;
        rows.push({
          id: createId(),
          clientId,
          userId,
          teamRole,
          createdAt: nowIso(),
        });
      }
    }

    await db.transaction(async (tx) => {
      await tx.delete(clientTeamMembers).where(eq(clientTeamMembers.clientId, clientId));
      if (rows.length > 0) {
        await tx.insert(clientTeamMembers).values(rows);
      }
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid planner action." }, { status: 400 });
}
