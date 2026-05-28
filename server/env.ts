import "server-only";

type DatabaseConfig = {
  url: string;
  authToken?: string;
};

function readRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getDatabaseConfig(): DatabaseConfig {
  return {
    url: readRequiredEnv("TURSO_DATABASE_URL"),
    authToken: process.env.TURSO_AUTH_TOKEN,
  };
}

export function getSessionSecret() {
  return readRequiredEnv("SESSION_SECRET");
}

export function getBasecampAccountId() {
  return process.env.BASECAMP_ACCOUNT_ID ?? "";
}

