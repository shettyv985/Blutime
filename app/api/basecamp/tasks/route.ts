import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { departments, users } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { canManagePlanner, canViewCompanyDashboard } from "@/server/auth/permissions";
import { getAllAssignedTasksForPerson, getAssignedTasksForPerson } from "@/server/basecamp/client";
import { db } from "@/server/db/client";

function isAccountManagerDepartment(departmentName: string | null | undefined) {
  return departmentName?.toLowerCase().includes("account manager") ?? false;
}

function canViewTeamBasecampTasks(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  return Boolean(user && (canViewCompanyDashboard(user) || canManagePlanner(user) || isAccountManagerDepartment(user.departmentName)));
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const userId = new URL(request.url).searchParams.get("userId");

  if (userId) {
    if (userId !== user.userId && !canViewTeamBasecampTasks(user)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const [targetUser] = await db
      .select({
        id: users.id,
        name: users.name,
        departmentName: departments.name,
        basecampPersonId: users.basecampPersonId,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(and(eq(users.id, userId), eq(users.isActive, true)))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: "Team member not found." }, { status: 404 });
    }

    if (!targetUser.basecampPersonId) {
      return NextResponse.json({
        tasks: [],
        user: {
          id: targetUser.id,
          name: targetUser.name,
          departmentName: targetUser.departmentName,
        },
        warning: "No Basecamp person ID is mapped to this user.",
      });
    }

    try {
      const tasks = await getAllAssignedTasksForPerson(targetUser.basecampPersonId);
      return NextResponse.json({
        tasks,
        user: {
          id: targetUser.id,
          name: targetUser.name,
          departmentName: targetUser.departmentName,
        },
      });
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: "Could not fetch Basecamp tasks." }, { status: 502 });
    }
  }

  if (!user.basecampPersonId) {
    return NextResponse.json({ tasks: [], warning: "No Basecamp person ID mapped." });
  }

  try {
    const tasks = await getAssignedTasksForPerson(user.basecampPersonId);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not fetch Basecamp tasks." }, { status: 502 });
  }
}
