import { NextResponse } from "next/server";

import { getManusTaskMessages } from "@/server/ai/providers";
import { getCurrentUser } from "@/server/auth/current-user";
import { canUseAiMasterBrain } from "@/server/auth/permissions";

type RouteParams = {
  params: Promise<{ taskId: string }>;
};

export async function GET(_request: Request, context: RouteParams) {
  const user = await getCurrentUser();
  const { taskId } = await context.params;

  if (!user || !canUseAiMasterBrain(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    return NextResponse.json(await getManusTaskMessages(taskId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not poll Manus." }, { status: 500 });
  }
}
