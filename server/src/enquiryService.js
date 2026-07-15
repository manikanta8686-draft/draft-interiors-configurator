import { randomUUID } from "node:crypto";
import {
  getSofaModelById,
  normalizeConfiguration,
} from "../../client/src/configurator/configuration.js";
import { calculatePricing } from "../../client/src/pricing/pricingEngine.js";
import { EnquiryValidationError } from "./errors.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const PHONE_CHARACTERS = /^\+?[0-9 ()-]+$/u;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value, label, { min = 1, max } = {}) {
  if (typeof value !== "string") throw new EnquiryValidationError(`${label} is required.`);
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) {
    throw new EnquiryValidationError(`${label} must be between ${min} and ${max} characters.`);
  }
  return normalized;
}

function singleLineText(value, label, options) {
  const normalized = text(value, label, options);
  if (/\r|\n/u.test(normalized)) throw new EnquiryValidationError(`${label} must be a single line.`);
  return normalized;
}

function normalizeCustomer(value) {
  if (!isObject(value)) throw new EnquiryValidationError("Customer details are required.");
  const email = singleLineText(value.email, "Email address", { max: 254 }).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) throw new EnquiryValidationError("Enter a valid email address.");
  const phone = value.phone ? singleLineText(value.phone, "Phone number", { max: 30 }) : null;
  const phoneDigits = phone?.replace(/\D/gu, "") ?? "";
  if (phone && (!PHONE_CHARACTERS.test(phone) || phoneDigits.length < 8 || phoneDigits.length > 15)) {
    throw new EnquiryValidationError("Enter a valid phone number with 8 to 15 digits.");
  }
  return {
    name: singleLineText(value.name, "Name", { max: 80 }),
    email,
    phone,
  };
}

function normalizeDesign(value, source) {
  if (value === undefined || value === null) {
    if (source === "configurator") throw new EnquiryValidationError("A sofa configuration is required.");
    return { configuration: null, pricing: null };
  }
  if (!isObject(value)) throw new EnquiryValidationError("The sofa configuration is invalid.");
  const model = getSofaModelById(value.modelId);
  if (!model) throw new EnquiryValidationError("The sofa configuration is invalid.");
  const configuration = normalizeConfiguration(value, model);
  return { configuration, pricing: calculatePricing(configuration, model) };
}

export class EnquiryService {
  constructor(repository, {
    createId = randomUUID,
    now = () => new Date(),
    notifier = null,
  } = {}) {
    this.repository = repository;
    this.createId = createId;
    this.now = now;
    this.notifier = notifier;
  }

  async create(payload) {
    if (!isObject(payload)) throw new EnquiryValidationError();

    // Silently accept honeypot submissions without storing customer data.
    if (typeof payload.website === "string" && payload.website.trim()) {
      return { id: this.createId(), status: "received", createdAt: this.now().toISOString() };
    }

    const source = payload.source === "configurator" ? "configurator" : payload.source === "contact" ? "contact" : null;
    if (!source) throw new EnquiryValidationError("The enquiry source is invalid.");
    if (typeof payload.submissionId !== "string" || !UUID_V4_PATTERN.test(payload.submissionId)) {
      throw new EnquiryValidationError("The enquiry submission ID is invalid.");
    }
    const existing = this.repository.findEnquiryReceiptBySubmissionId(payload.submissionId);
    if (existing) return existing;
    if (payload.consent !== true) throw new EnquiryValidationError("Consent is required before submitting an enquiry.");

    const design = normalizeDesign(payload.configuration, source);
    const record = {
      id: this.createId(),
      source,
      customer: normalizeCustomer(payload.customer),
      message: text(payload.message, "Message", { min: 10, max: 2000 }),
      ...design,
      notificationStatus: this.notifier ? "pending" : "not_configured",
      submissionId: payload.submissionId,
      createdAt: this.now().toISOString(),
    };
    this.repository.createEnquiry(record);

    if (this.notifier) {
      try {
        await this.notifier.send(record);
        record.notificationStatus = "delivered";
      } catch {
        record.notificationStatus = "failed";
      }
      this.repository.updateEnquiryNotificationStatus(record.id, record.notificationStatus);
    }

    return { id: record.id, status: "received", createdAt: record.createdAt };
  }
}
