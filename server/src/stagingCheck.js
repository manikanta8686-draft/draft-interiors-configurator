import { existsSync, realpathSync } from "node:fs";
import { isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultClientBuild = fileURLToPath(new URL("../../client/dist/index.html", import.meta.url));
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function checkStagingReadiness(environment = process.env, { clientBuild = defaultClientBuild } = {}) {
  const checks = [
    ["Production mode", environment.NODE_ENV === "production"],
    ["Built client enabled", String(environment.SERVE_CLIENT).toLowerCase() === "true"],
    ["Client production build", existsSync(clientBuild)],
    ["Persistent database path", Boolean(environment.DATABASE_PATH && isAbsolute(environment.DATABASE_PATH))],
    ["External backup directory", Boolean(environment.BACKUP_DIRECTORY && isAbsolute(environment.BACKUP_DIRECTORY) && environment.BACKUP_DIRECTORY !== environment.DATABASE_PATH)],
    ["Admin email", EMAIL_PATTERN.test(environment.ADMIN_EMAIL ?? "")],
    ["Admin password hash", /^scrypt\$[^$]+\$[^$]+$/u.test(environment.ADMIN_PASSWORD_HASH ?? "")],
    ["Admin session secret", (environment.ADMIN_SESSION_SECRET?.length ?? 0) >= 32],
    ["Secure admin cookies", String(environment.ADMIN_SECURE_COOKIES).toLowerCase() === "true"],
    ["SMTP host", Boolean(environment.SMTP_HOST)],
    ["SMTP user", Boolean(environment.SMTP_USER)],
    ["SMTP password", Boolean(environment.SMTP_PASSWORD)],
    ["SMTP sender", Boolean(environment.SMTP_FROM)],
    ["Enquiry recipient", EMAIL_PATTERN.test(environment.ENQUIRY_RECIPIENT_EMAIL ?? "")],
  ].map(([name, passed]) => ({ name, passed }));
  return { ready: checks.every((check) => check.passed), checks };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const result = checkStagingReadiness();
  for (const check of result.checks) process.stdout.write(`${check.passed ? "PASS" : "FAIL"}  ${check.name}\n`);
  if (!result.ready) process.exitCode = 1;
}
