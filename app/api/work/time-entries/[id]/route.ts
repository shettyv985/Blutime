import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { timeEntries, timeEntryAuditLogs } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { canViewCompanyDashboard } from "@/server/auth/permissions";
import { db } from "@/server/db/client";
import { createId } from "@/server/ids";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteParams) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [entry] = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.id, id), isNull(timeEntries.deletedAt)))
    .limit(1);

  if (!entry) {
    return NextResponse.json({ error: "Log not found." }, { status: 404 });
  }

  const canDeleteOtherLogs = canViewCompanyDashboard(user);
  if (entry.userId !== user.userId && !canDeleteOtherLogs) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const now = new Date().toISOString();

  await db.transaction(async (tx) => {
    await tx
      .update(timeEntries)
      .set({
        deletedAt: now,
        deletedByUserId: user.userId,
        updatedAt: now,
      })
      .where(eq(timeEntries.id, id));

    await tx.insert(timeEntryAuditLogs).values({
      id: createId(),
      timeEntryId: id,
      actorUserId: user.userId,
      action: "delete",
      beforeJson: JSON.stringify(entry),
      afterJson: JSON.stringify({ deletedAt: now, deletedByUserId: user.userId }),
      createdAt: now,
    });
  });

  return NextResponse.json({ ok: true });
}
