import { fileURLToPath } from "node:url";

const defaultDatabasePath = fileURLToPath(new URL("../data/configurations.sqlite", import.meta.url));
const defaultStaticDirectory = fileURLToPath(new URL("../../client/dist", import.meta.url));
const defaultBackupDirectory = fileURLToPath(new URL("../backups", import.meta.url));

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function boolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === "true";
}

function trustProxy(value) {
  if (value === undefined || value === "" || String(value).toLowerCase() === "false") return false;
  if (String(value).toLowerCase() === "true") return true;
  const hops = Number.parseInt(value, 10);
  return Number.isInteger(hops) && hops > 0 ? hops : value;
}

export function readEnvironment(environment = process.env) {
  return {
    port: positiveInteger(environment.PORT, 8787),
    databasePath: environment.DATABASE_PATH || defaultDatabasePath,
    jsonBodyLimit: environment.JSON_BODY_LIMIT || "16kb",
    nodeEnvironment: environment.NODE_ENV || "development",
    trustProxy: trustProxy(environment.TRUST_PROXY),
    serveClient: boolean(environment.SERVE_CLIENT, environment.NODE_ENV === "production"),
    staticDirectory: environment.STATIC_DIRECTORY || defaultStaticDirectory,
    backupDirectory: environment.BACKUP_DIRECTORY || defaultBackupDirectory,
    backupRetentionDays: positiveInteger(environment.BACKUP_RETENTION_DAYS, 30),
    enquiryRetentionDays: positiveInteger(environment.ENQUIRY_RETENTION_DAYS, 90),
    enquiryRecipientEmail: environment.ENQUIRY_RECIPIENT_EMAIL || "manikanta8686@draftinteriors.com",
    admin: {
      email: environment.ADMIN_EMAIL || "",
      passwordHash: environment.ADMIN_PASSWORD_HASH || "",
      sessionSecret: environment.ADMIN_SESSION_SECRET || "",
      secureCookies: boolean(environment.ADMIN_SECURE_COOKIES, environment.NODE_ENV === "production"),
    },
    smtp: environment.SMTP_HOST && environment.SMTP_USER && environment.SMTP_PASSWORD && environment.SMTP_FROM
      ? {
          host: environment.SMTP_HOST,
          port: positiveInteger(environment.SMTP_PORT, 587),
          secure: boolean(environment.SMTP_SECURE),
          user: environment.SMTP_USER,
          password: environment.SMTP_PASSWORD,
          from: environment.SMTP_FROM,
        }
      : null,
  };
}
