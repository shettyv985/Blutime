import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";

import { categories, departments, users } from "../db/schema";
import { createId } from "../server/ids";
import { defaultCategories, defaultDepartments, slugify } from "../server/seed/defaults";

loadEnvConfig(process.cwd());

let db: ReturnType<typeof import("../server/db/create-database")["createDatabase"]>;
let hashPassword: typeof import("../server/auth/password-core")["hashPassword"];

function nowIso() {
  return new Date().toISOString();
}

async function seedDepartments() {
  for (const department of defaultDepartments) {
    const [existingDepartment] = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.slug, department.slug))
      .limit(1);

    if (existingDepartment) {
      await db
        .update(departments)
        .set({
          name: department.name,
          isActive: true,
          updatedAt: nowIso(),
        })
        .where(eq(departments.id, existingDepartment.id));
      continue;
    }

    await db.insert(departments).values({
      id: createId(),
      name: department.name,
      slug: department.slug,
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }
}

async function seedCategories() {
  for (const [index, categoryName] of defaultCategories.entries()) {
    const slug = slugify(categoryName);
    const [existingCategory] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    if (existingCategory) {
      await db
        .update(categories)
        .set({
          name: categoryName,
          displayOrder: index + 1,
          isActive: true,
          updatedAt: nowIso(),
        })
        .where(eq(categories.id, existingCategory.id));
      continue;
    }

    await db.insert(categories).values({
      id: createId(),
      name: categoryName,
      slug,
      displayOrder: index + 1,
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }
}

async function seedBossUser() {
  const email = process.env.SEED_BOSS_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_BOSS_PASSWORD;
  const name = process.env.SEED_BOSS_NAME?.trim() || "Boss";

  if (!email || !password) {
    console.log("Skipped boss user seed. Set SEED_BOSS_EMAIL and SEED_BOSS_PASSWORD to create it.");
    return;
  }

  const [bossDepartment] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.slug, "boss"))
    .limit(1);

  if (!bossDepartment) {
    throw new Error("Boss department was not seeded.");
  }

  const passwordHash = await hashPassword(password);
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    await db
      .update(users)
      .set({
        name,
        passwordHash,
        accessRole: "boss",
        departmentId: bossDepartment.id,
        isActive: true,
        updatedAt: nowIso(),
      })
      .where(eq(users.id, existingUser.id));
    console.log(`Updated boss user: ${email}`);
    return;
  }

  await db.insert(users).values({
    id: createId(),
    name,
    email,
    passwordHash,
    accessRole: "boss",
    departmentId: bossDepartment.id,
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  console.log(`Created boss user: ${email}`);
}

async function main() {
  const { createDatabase } = await import("../server/db/create-database");
  ({ hashPassword } = await import("../server/auth/password-core"));

  const databaseUrl = process.env.TURSO_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing TURSO_DATABASE_URL.");
  }

  db = createDatabase({
    url: databaseUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  await seedDepartments();
  await seedCategories();
  await seedBossUser();

  console.log("Initial blu-time seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
