import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { getAssignedTasksForPerson } from "@/server/basecamp/client";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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

