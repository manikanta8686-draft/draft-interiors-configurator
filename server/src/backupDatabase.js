import { mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { backup, DatabaseSync } from "node:sqlite";
import { readEnvironment } from "./config.js";
import { operationalLogger } from "./logger.js";

function backupName(now) {
  return `draft-interiors-${now.toISOString().replace(/[:.]/gu, "-")}.sqlite`;
}

function verifyBackup(path) {
  const database = new DatabaseSync(path, { readOnly: true });
  try {
    const integrity = database.prepare("PRAGMA integrity_check").get();
    const migrations = database.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get();
    if (integrity?.integrity_check !== "ok" || !Number.isInteger(migrations?.count) || migrations.count < 1) {
      throw new Error("Backup verification failed");
    }
    return { migrations: migrations.count };
  } finally {
    database.close();
  }
}

function purgeExpiredBackups(directory, retentionDays, now) {
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const name of readdirSync(directory).filter((value) => /^draft-interiors-.*\.sqlite$/u.test(value))) {
    const path = join(directory, name);
    if (statSync(path).mtimeMs < cutoff) {
      unlinkSync(path);
      removed += 1;
    }
  }
  return removed;
}

export async function createDatabaseBackup({ databasePath, backupDirectory, retentionDays = 30, now = new Date() }) {
  if (!databasePath || databasePath === ":memory:") throw new Error("A persistent SQLite database is required.");
  const sourcePath = resolve(databasePath);
  const destinationDirectory = resolve(backupDirectory);
  if (sourcePath.startsWith(`${destinationDirectory}\\`) || sourcePath.startsWith(`${destinationDirectory}/`)) {
    throw new Error("The live database must not be stored inside the backup directory.");
  }
  mkdirSync(destinationDirectory, { recursive: true });
  const destination = join(destinationDirectory, backupName(now));
  const source = new DatabaseSync(sourcePath, { readOnly: true });
  try {
    await backup(source, destination);
  } finally {
    source.close();
  }
  const verification = verifyBackup(destination);
  const removed = purgeExpiredBackups(destinationDirectory, retentionDays, now);
  return { path: destination, file: basename(destination), migrations: verification.migrations, removed };
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replaceAll("\\", "/")}`).href) {
  const configuration = readEnvironment();
  try {
    const result = await createDatabaseBackup({
      databasePath: configuration.databasePath,
      backupDirectory: configuration.backupDirectory,
      retentionDays: configuration.backupRetentionDays,
    });
    operationalLogger.info("database_backup_complete", {
      file: result.file,
      migrations: result.migrations,
      expiredBackupsRemoved: result.removed,
    });
  } catch (error) {
    operationalLogger.error("database_backup_failed", { errorName: error?.name ?? "Error" });
    process.exitCode = 1;
  }
}
