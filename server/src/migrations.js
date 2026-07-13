import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const defaultMigrationsDirectory = fileURLToPath(new URL("../migrations", import.meta.url));

export function runMigrations(database, migrationsDirectory = defaultMigrationsDirectory) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    ) STRICT;
  `);
  const applied = new Set(
    database.prepare("SELECT name FROM schema_migrations").all().map((row) => row.name),
  );
  const insertMigration = database.prepare(
    "INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)",
  );

  for (const name of readdirSync(migrationsDirectory).filter((file) => file.endsWith(".sql")).sort()) {
    if (applied.has(name)) continue;
    const sql = readFileSync(`${migrationsDirectory}/${name}`, "utf8");
    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(sql);
      insertMigration.run(name, new Date().toISOString());
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
}
