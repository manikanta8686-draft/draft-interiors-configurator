import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { ApiError } from "./errors.js";

const SESSION_SECONDS = 8 * 60 * 60;
const COOKIE_NAME = "di_admin_session";

function encode(value) {
  return Buffer.from(value).toString("base64url");
}

function signature(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function parseCookie(header = "") {
  return Object.fromEntries(header.split(";").map((part) => part.trim().split("=")).filter(([key]) => key));
}

export function createAdminPasswordHash(password, salt = randomBytes(16)) {
  const derived = scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

function verifyPassword(password, encodedHash) {
  const [scheme, salt, expected] = String(encodedHash ?? "").split("$");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const actual = scryptSync(password, Buffer.from(salt, "base64url"), 32).toString("base64url");
  return safeEqual(actual, expected);
}

export class AdminAuthService {
  constructor({ email, passwordHash, sessionSecret, secureCookies = false, now = () => new Date() } = {}) {
    this.email = email?.trim().toLowerCase() ?? "";
    this.passwordHash = passwordHash ?? "";
    this.sessionSecret = sessionSecret ?? "";
    this.secureCookies = secureCookies;
    this.now = now;
  }

  get enabled() {
    return Boolean(this.email && this.passwordHash && this.sessionSecret.length >= 32);
  }

  authenticate(email, password) {
    if (!this.enabled) throw new ApiError(503, "ADMIN_NOT_CONFIGURED", "Admin access has not been configured.");
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const validEmail = safeEqual(normalizedEmail, this.email);
    const validPassword = typeof password === "string" && password.length <= 256
      ? verifyPassword(password, this.passwordHash)
      : false;
    if (!validEmail || !validPassword) {
      throw new ApiError(401, "INVALID_ADMIN_CREDENTIALS", "Email or password is incorrect.");
    }
    return this.createSession();
  }

  createSession() {
    const expiresAt = new Date(this.now().getTime() + SESSION_SECONDS * 1000);
    const payload = encode(JSON.stringify({ sub: this.email, exp: Math.floor(expiresAt.getTime() / 1000) }));
    return { token: `${payload}.${signature(payload, this.sessionSecret)}`, expiresAt };
  }

  readSession(cookieHeader) {
    if (!this.enabled) return null;
    const token = parseCookie(cookieHeader)[COOKIE_NAME];
    const [payload, suppliedSignature] = String(token ?? "").split(".");
    if (!payload || !suppliedSignature || !safeEqual(signature(payload, this.sessionSecret), suppliedSignature)) return null;
    try {
      const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      if (session.sub !== this.email || session.exp <= Math.floor(this.now().getTime() / 1000)) return null;
      return { email: session.sub, expiresAt: new Date(session.exp * 1000).toISOString() };
    } catch {
      return null;
    }
  }

  sessionCookie(token) {
    return `${COOKIE_NAME}=${token}; Path=/api/v1/admin; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${this.secureCookies ? "; Secure" : ""}`;
  }

  clearCookie() {
    return `${COOKIE_NAME}=; Path=/api/v1/admin; HttpOnly; SameSite=Strict; Max-Age=0${this.secureCookies ? "; Secure" : ""}`;
  }
}
