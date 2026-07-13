import { randomUUID } from "node:crypto";
import {
  CONFIGURATION_SCHEMA_VERSION,
  getSofaModelById,
  normalizeConfiguration,
} from "../../client/src/configurator/configuration.js";
import { calculatePricing } from "../../client/src/pricing/pricingEngine.js";
import { NotFoundError, ValidationError } from "./errors.js";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeName(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("Name must be a non-empty string when provided.");
  }
  return value.trim().slice(0, 80);
}

export function isPublicConfigurationId(value) {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

export class ConfigurationService {
  constructor(repository, { createId = randomUUID, now = () => new Date() } = {}) {
    this.repository = repository;
    this.createId = createId;
    this.now = now;
  }

  create(payload) {
    if (!isObject(payload) || !isObject(payload.configuration)) throw new ValidationError();
    const model = getSofaModelById(payload.configuration.modelId);
    if (!model) throw new ValidationError("Unknown model ID.");

    const configuration = normalizeConfiguration(payload.configuration, model);
    const record = {
      id: this.createId(),
      version: CONFIGURATION_SCHEMA_VERSION,
      name: normalizeName(payload.name),
      configuration,
      pricing: calculatePricing(configuration, model),
      createdAt: this.now().toISOString(),
    };
    return this.repository.create(record);
  }

  getById(id) {
    if (!isPublicConfigurationId(id)) throw new NotFoundError();
    const record = this.repository.findById(id);
    if (!record) throw new NotFoundError();
    return record;
  }
}
