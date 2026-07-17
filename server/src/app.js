import express from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { ApiError, RateLimitError } from "./errors.js";

function createEnquiryRateLimiter({ max = 5, windowMs = 15 * 60 * 1000, createError = () => new RateLimitError() } = {}) {
  const attempts = new Map();
  return (key, now = Date.now()) => {
    const active = (attempts.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);
    if (active.length >= max) throw createError();
    active.push(now);
    attempts.set(key, active);
  };
}

export function createApp({ configurationService, enquiryService, adminAuthService, adminService, enquiryRateLimit, jsonBodyLimit = "16kb", trustProxy = false, production = false, staticDirectory = null, readinessCheck = () => true, logger = console }) {
  const app = express();
  const limitEnquiry = createEnquiryRateLimiter(enquiryRateLimit);
  const limitAdminLogin = createEnquiryRateLimiter({
    max: 8,
    windowMs: 15 * 60 * 1000,
    createError: () => new ApiError(429, "TOO_MANY_ADMIN_ATTEMPTS", "Too many sign-in attempts. Please wait and try again."),
  });
  app.disable("x-powered-by");
  if (trustProxy !== false) app.set("trust proxy", trustProxy);
  app.use((request, response, next) => {
    const requestId = randomUUID();
    request.requestId = requestId;
    response.setHeader("X-Request-ID", requestId);
    response.set({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
    if (production) response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    if (request.path.startsWith("/api/")) {
      response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    }
    const startedAt = performance.now();
    response.on("finish", () => logger.info?.("http_request", {
      requestId,
      method: request.method,
      path: request.path,
      status: response.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
    }));
    next();
  });
  app.use(express.json({ limit: jsonBodyLimit, strict: true }));

  app.get(["/api/v1/health", "/api/v1/health/ready"], (request, response) => {
    try {
      if (!readinessCheck()) throw new Error("Readiness check failed");
      response.json({ data: { status: "ready" } });
    } catch {
      response.status(503).json({ error: { code: "NOT_READY", message: "The service is not ready." } });
    }
  });

  app.get("/api/v1/health/live", (request, response) => {
    response.json({ data: { status: "live" } });
  });

  app.post("/api/v1/configurations", (request, response, next) => {
    try {
      response.status(201).json({ data: configurationService.create(request.body) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/configurations/:id", (request, response, next) => {
    try {
      response.json({ data: configurationService.getById(request.params.id) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/enquiries", async (request, response, next) => {
    try {
      if (!enquiryService) {
        throw new ApiError(503, "ENQUIRY_UNAVAILABLE", "The enquiry service is unavailable.");
      }
      limitEnquiry(request.ip);
      response.status(201).json({ data: await enquiryService.create(request.body) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/session", (request, response, next) => {
    try {
      if (!adminAuthService) throw new ApiError(503, "ADMIN_NOT_CONFIGURED", "Admin access has not been configured.");
      limitAdminLogin(request.ip);
      const session = adminAuthService.authenticate(request.body?.email, request.body?.password);
      response.setHeader("Set-Cookie", adminAuthService.sessionCookie(session.token));
      response.json({ data: { email: adminAuthService.email, expiresAt: session.expiresAt.toISOString() } });
    } catch (error) {
      next(error);
    }
  });

  function requireAdmin(request, response, next) {
    const session = adminAuthService?.readSession(request.headers.cookie);
    if (!session) {
      next(new ApiError(401, "ADMIN_AUTH_REQUIRED", "Sign in to continue."));
      return;
    }
    request.adminSession = session;
    next();
  }

  function requireAdminMutation(request, response, next) {
    if (request.get("x-admin-request") !== "DraftInteriors") {
      next(new ApiError(403, "ADMIN_REQUEST_REJECTED", "The admin request could not be verified."));
      return;
    }
    next();
  }

  app.get("/api/v1/admin/session", requireAdmin, (request, response) => {
    response.json({ data: request.adminSession });
  });

  app.delete("/api/v1/admin/session", requireAdminMutation, (request, response) => {
    response.setHeader("Set-Cookie", adminAuthService?.clearCookie() ?? "");
    response.status(204).end();
  });

  app.get("/api/v1/admin/enquiries", requireAdmin, (request, response, next) => {
    try {
      response.json({ data: adminService.list(request.query) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/enquiries/:id", requireAdmin, (request, response, next) => {
    try {
      response.json({ data: adminService.get(request.params.id) });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/v1/admin/enquiries/:id/status", requireAdmin, requireAdminMutation, (request, response, next) => {
    try {
      response.json({ data: adminService.updateStatus(request.params.id, request.body?.status) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/admin/enquiries/:id/notes", requireAdmin, requireAdminMutation, (request, response, next) => {
    try {
      response.status(201).json({ data: adminService.addNote(request.params.id, request.body?.body, request.adminSession.email) });
    } catch (error) {
      next(error);
    }
  });

  if (staticDirectory && existsSync(join(staticDirectory, "index.html"))) {
    app.use(express.static(staticDirectory, {
      index: false,
      immutable: production,
      maxAge: production ? "1h" : 0,
      setHeaders(response, filePath) {
        if (filePath.endsWith("index.html")) response.setHeader("Cache-Control", "no-cache");
      },
    }));
    app.use((request, response, next) => {
      if (request.method !== "GET" || request.path.startsWith("/api/") || !request.accepts("html")) {
        next();
        return;
      }
      response.set({
        "Cache-Control": "no-cache",
        "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://images.unsplash.com; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
      });
      response.sendFile(join(staticDirectory, "index.html"));
    });
  }

  app.use((request, response) => {
    response.status(404).json({ error: { code: "NOT_FOUND", message: "Resource not found." } });
  });

  app.use((error, request, response, next) => {
    if (error instanceof ApiError) {
      response.status(error.status).json({ error: { code: error.code, message: error.message } });
      return;
    }
    if (error instanceof SyntaxError && Object.hasOwn(error, "body")) {
      response.status(400).json({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } });
      return;
    }
    if (error?.type === "entity.too.large") {
      response.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large." } });
      return;
    }
    logger.error?.("request_failed", {
      requestId: request.requestId,
      method: request.method,
      path: request.path,
      errorName: error?.name ?? "Error",
    });
    response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "The request could not be completed." } });
  });

  return app;
}
