import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { categories } from "@/db/schema";
import { getCurrentUser } from "@/server/auth/current-user";
import { canManageUsers } from "@/server/auth/permissions";
import { db } from "@/server/db/client";
import { createId } from "@/server/ids";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canManageUsers(currentUser)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      isActive: categories.isActive,
    })
    .from(categories)
    .orderBy(asc(categories.displayOrder), asc(categories.name));

  return NextResponse.json({ categories: rows });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canManageUsers(currentUser)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  const name = body?.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  }

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "Use a clearer category name." }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: categories.id, isActive: categories.isActive })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);

  const now = new Date().toISOString();

  if (existing) {
    await db
      .update(categories)
      .set({ name, isActive: true, updatedAt: now })
      .where(eq(categories.id, existing.id));
    return NextResponse.json({ ok: true, id: existing.id });
  }

  const id = createId();
  await db.insert(categories).values({
    id,
    name,
    slug,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canManageUsers(currentUser)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    name?: string;
    isActive?: boolean;
  } | null;
  const id = body?.id?.trim();
  const name = body?.name?.trim();

  if (!id || !name) {
    return NextResponse.json({ error: "Category ID and name are required." }, { status: 400 });
  }

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "Use a clearer category name." }, { status: 400 });
  }

  await db
    .update(categories)
    .set({
      name,
      slug,
      isActive: body?.isActive ?? true,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(categories.id, id));

  return NextResponse.json({ ok: true });
}
