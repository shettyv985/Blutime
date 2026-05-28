import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { departments, users, type AccessRole } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { hashPassword } from "@/server/auth/password";
import { canManageUsers } from "@/server/auth/permissions";
import { db } from "@/server/db/client";
import { createId } from "@/server/ids";

const allowedAccessRoles: AccessRole[] = ["employee", "lead", "hr_ops", "boss"];

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canManageUsers(currentUser)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const appUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      accessRole: users.accessRole,
      departmentId: users.departmentId,
      departmentName: departments.name,
      basecampPersonId: users.basecampPersonId,
      isActive: users.isActive,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .orderBy(asc(users.name));

  return NextResponse.json({ users: appUsers });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canManageUsers(currentUser)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    email?: string;
    password?: string;
    accessRole?: AccessRole;
    departmentId?: string;
    basecampPersonId?: string;
  } | null;

  const name = body?.name?.trim();
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";
  const accessRole = body?.accessRole ?? "employee";
  const departmentId = body?.departmentId?.trim() || null;
  const basecampPersonId = body?.basecampPersonId?.trim() || null;

  if (!name || !email || !password || !departmentId) {
    return NextResponse.json(
      { error: "Name, email, password, and department are required." },
      { status: 400 }
    );
  }

  if (!allowedAccessRoles.includes(accessRole)) {
    return NextResponse.json({ error: "Invalid access role." }, { status: 400 });
  }

  const [department] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.id, departmentId))
    .limit(1);

  if (!department) {
    return NextResponse.json({ error: "Invalid department." }, { status: 400 });
  }

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
  }

  await db.insert(users).values({
    id: createId(),
    name,
    email,
    passwordHash: await hashPassword(password),
    accessRole,
    departmentId,
    basecampPersonId,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canManageUsers(currentUser)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    name?: string;
    email?: string;
    password?: string;
    accessRole?: AccessRole;
    departmentId?: string;
    basecampPersonId?: string;
    isActive?: boolean;
  } | null;

  const id = body?.id?.trim();
  const name = body?.name?.trim();
  const email = body?.email?.trim().toLowerCase();
  const accessRole = body?.accessRole;
  const departmentId = body?.departmentId?.trim() || null;
  const basecampPersonId = body?.basecampPersonId?.trim() || null;

  if (!id || !name || !email || !accessRole || !departmentId) {
    return NextResponse.json(
      { error: "User ID, name, email, role, and department are required." },
      { status: 400 }
    );
  }

  if (!allowedAccessRoles.includes(accessRole)) {
    return NextResponse.json({ error: "Invalid access role." }, { status: 400 });
  }

  const [department] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.id, departmentId))
    .limit(1);

  if (!department) {
    return NextResponse.json({ error: "Invalid department." }, { status: 400 });
  }

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!existingUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const [emailOwner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (emailOwner && emailOwner.id !== id) {
    return NextResponse.json({ error: "Another user already has this email." }, { status: 409 });
  }

  await db
    .update(users)
    .set({
      name,
      email,
      accessRole,
      departmentId,
      basecampPersonId,
      isActive: body?.isActive ?? true,
      ...(body?.password ? { passwordHash: await hashPassword(body.password) } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, id));

  return NextResponse.json({ ok: true });
}
