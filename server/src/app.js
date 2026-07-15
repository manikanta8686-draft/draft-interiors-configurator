import express from "express";
import { ApiError, RateLimitError } from "./errors.js";

function createEnquiryRateLimiter({ max = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const attempts = new Map();
  return (key, now = Date.now()) => {
    const active = (attempts.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);
    if (active.length >= max) throw new RateLimitError();
    active.push(now);
    attempts.set(key, active);
  };
}

export function createApp({ configurationService, enquiryService, enquiryRateLimit, jsonBodyLimit = "16kb", logger = console }) {
  const app = express();
  const limitEnquiry = createEnquiryRateLimiter(enquiryRateLimit);
  app.disable("x-powered-by");
  app.use((request, response, next) => {
    response.set({
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'",
      "X-Content-Type-Options": "nosniff",
    });
    next();
  });
  app.use(express.json({ limit: jsonBodyLimit, strict: true }));

  app.get("/api/v1/health", (request, response) => {
    response.json({ data: { status: "ok" } });
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
    logger.error("Configuration API request failed", error);
    response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "The request could not be completed." } });
  });

  return app;
}
