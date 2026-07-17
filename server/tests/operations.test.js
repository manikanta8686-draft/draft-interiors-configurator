import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { createApp } from "../src/app.js";
import { createDatabaseBackup } from "../src/backupDatabase.js";
import { checkStagingReadiness } from "../src/stagingCheck.js";
import { SqliteConfigurationRepository } from "../src/repositories/sqliteConfigurationRepository.js";

async function withServer(app, run) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("liveness remains available while readiness verifies the database", async () => {
  const events = [];
  const app = createApp({
    readinessCheck: () => false,
    logger: { info(event, details) { events.push({ event, details }); }, error() {} },
  });
  await withServer(app, async (baseUrl) => {
    const live = await fetch(`${baseUrl}/api/v1/health/live`);
    assert.equal(live.status, 200);
    assert.equal((await live.json()).data.status, "live");
    assert.match(live.headers.get("x-request-id"), /^[0-9a-f-]{36}$/u);
    const ready = await fetch(`${baseUrl}/api/v1/health/ready`);
    assert.equal(ready.status, 503);
    assert.equal((await ready.json()).error.code, "NOT_READY");
  });
  assert.equal(events.some((item) => item.event === "http_request" && item.details.status === 503), true);
});

test("production server can serve the built SPA with a restrictive browser policy", async () => {
  const directory = mkdtempSync(join(tmpdir(), "draft-interiors-static-"));
  writeFileSync(join(directory, "index.html"), "<!doctype html><title>Draft Interiors</title>");
  const app = createApp({ staticDirectory: directory, production: true, logger: { info() {}, error() {} } });
  try {
    await withServer(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/admin`, { headers: { accept: "text/html" } });
      assert.equal(response.status, 200);
      assert.match(await response.text(), /Draft Interiors/u);
      assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/u);
      assert.match(response.headers.get("strict-transport-security"), /max-age=31536000/u);
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("SQLite backup is online, verified, and kept outside the live database directory", async () => {
  const directory = mkdtempSync(join(tmpdir(), "draft-interiors-backup-"));
  const dataDirectory = join(directory, "data");
  const backupDirectory = join(directory, "backups");
  mkdirSync(dataDirectory);
  const databasePath = join(dataDirectory, "live.sqlite");
  const repository = new SqliteConfigurationRepository(databasePath);
  try {
    const result = await createDatabaseBackup({
      databasePath,
      backupDirectory,
      retentionDays: 30,
      now: new Date("2026-07-17T12:00:00.000Z"),
    });
    assert.equal(result.file, "draft-interiors-2026-07-17T12-00-00-000Z.sqlite");
    assert.equal(result.migrations, 5);
    assert.deepEqual(readdirSync(backupDirectory), [result.file]);
    const backupRepository = new SqliteConfigurationRepository(result.path);
    assert.equal(backupRepository.healthCheck(), true);
    backupRepository.close();
  } finally {
    repository.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("staging gate reports missing secrets without printing their values", () => {
  const directory = mkdtempSync(join(tmpdir(), "draft-interiors-check-"));
  const clientBuild = join(directory, "index.html");
  writeFileSync(clientBuild, "ready");
  try {
    const base = {
      NODE_ENV: "production",
      SERVE_CLIENT: "true",
      DATABASE_PATH: join(directory, "data.sqlite"),
      BACKUP_DIRECTORY: join(directory, "backups"),
      ADMIN_EMAIL: "admin@draftinteriors.com",
      ADMIN_PASSWORD_HASH: "scrypt$c2FsdA$aGFzaA",
      ADMIN_SESSION_SECRET: "a-secret-with-more-than-thirty-two-characters",
      ADMIN_SECURE_COOKIES: "true",
      SMTP_HOST: "smtp.example.com",
      SMTP_USER: "mailer@example.com",
      SMTP_PASSWORD: "not-printed",
      SMTP_FROM: "Draft Interiors <mailer@example.com>",
      ENQUIRY_RECIPIENT_EMAIL: "sales@draftinteriors.com",
    };
    assert.equal(checkStagingReadiness(base, { clientBuild }).ready, true);
    const missing = checkStagingReadiness({ ...base, SMTP_PASSWORD: "" }, { clientBuild });
    assert.equal(missing.ready, false);
    assert.equal(missing.checks.find((check) => check.name === "SMTP password").passed, false);
    assert.equal(JSON.stringify(missing).includes("not-printed"), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("operational commands execute when launched directly", () => {
  const directory = mkdtempSync(join(tmpdir(), "draft-interiors-cli-"));
  const databasePath = join(directory, "live.sqlite");
  const backupDirectory = join(directory, "backups");
  const linkedSource = join(directory, "current-src");
  symlinkSync(join(import.meta.dirname, "../src"), linkedSource, process.platform === "win32" ? "junction" : "dir");
  const repository = new SqliteConfigurationRepository(databasePath);
  repository.close();
  const environment = {
    ...process.env,
    NODE_ENV: "production",
    SERVE_CLIENT: "true",
    DATABASE_PATH: databasePath,
    BACKUP_DIRECTORY: backupDirectory,
    ADMIN_EMAIL: "admin@draftinteriors.com",
    ADMIN_PASSWORD_HASH: "scrypt$c2FsdA$aGFzaA",
    ADMIN_SESSION_SECRET: "a-secret-with-more-than-thirty-two-characters",
    ADMIN_SECURE_COOKIES: "true",
    SMTP_HOST: "smtp.example.com",
    SMTP_USER: "mailer@example.com",
    SMTP_PASSWORD: "not-printed",
    SMTP_FROM: "Draft Interiors <mailer@example.com>",
    ENQUIRY_RECIPIENT_EMAIL: "sales@draftinteriors.com",
  };
  try {
    const backup = spawnSync(process.execPath, [join(linkedSource, "backupDatabase.js")], {
      env: environment,
      encoding: "utf8",
    });
    assert.equal(backup.status, 0, backup.stderr);
    assert.match(backup.stdout, /database_backup_complete/u);
    assert.equal(readdirSync(backupDirectory).some((name) => name.endsWith(".sqlite")), true);

    const staging = spawnSync(process.execPath, [join(linkedSource, "stagingCheck.js")], {
      env: environment,
      encoding: "utf8",
    });
    assert.equal(staging.status, 0, staging.stderr);
    assert.match(staging.stdout, /PASS  SMTP password/u);
    assert.equal(staging.stdout.includes(environment.SMTP_PASSWORD), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
