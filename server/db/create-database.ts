import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "@/db/schema";

type DatabaseConfig = {
  url: string;
  authToken?: string;
};

export function createDatabase(config: DatabaseConfig) {
  const client = createClient({
    url: config.url,
    authToken: config.authToken,
  });

  return drizzle(client, { schema });
}

