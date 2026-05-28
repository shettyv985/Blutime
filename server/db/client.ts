import "server-only";

import { createDatabase } from "@/server/db/create-database";
import { getDatabaseConfig } from "@/server/env";

const databaseConfig = getDatabaseConfig();

export const db = createDatabase(databaseConfig);

export type Database = typeof db;
