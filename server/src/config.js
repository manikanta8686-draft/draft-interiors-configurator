import { fileURLToPath } from "node:url";

const defaultDatabasePath = fileURLToPath(new URL("../data/configurations.sqlite", import.meta.url));

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function readEnvironment(environment = process.env) {
  return {
    port: positiveInteger(environment.PORT, 8787),
    databasePath: environment.DATABASE_PATH || defaultDatabasePath,
    jsonBodyLimit: environment.JSON_BODY_LIMIT || "16kb",
  };
}
