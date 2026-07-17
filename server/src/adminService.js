import { randomUUID } from "node:crypto";
import { getSofaModelById } from "../../client/src/configurator/configuration.js";
import { getColourById, getFabricById } from "../../client/src/data/fabrics.js";
import { ApiError } from "./errors.js";

export const ENQUIRY_STATUSES = ["new", "contacted", "quote_sent", "negotiating", "confirmed", "closed"];
const SOURCES = ["contact", "configurator"];

function optionalChoice(value, choices, label) {
  if (value === undefined || value === null || value === "") return null;
  if (!choices.includes(value)) throw new ApiError(400, "INVALID_ADMIN_FILTER", `${label} is invalid.`);
  return value;
}

function positiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function decorate(record) {
  if (!record?.configuration) return record;
  const model = getSofaModelById(record.configuration.modelId);
  const fabric = getFabricById(record.configuration.fabricId);
  const colour = getColourById(record.configuration.colourId);
  return {
    ...record,
    specification: {
      model: model?.name ?? record.configuration.modelId,
      fabric: fabric?.name ?? record.configuration.fabricId,
      colour: colour?.name ?? record.configuration.colourId,
      dimensions: record.configuration.size,
      legs: record.configuration.legs,
      cushions: record.configuration.cushions,
    },
  };
}

export class AdminService {
  constructor(repository, { createId = randomUUID, now = () => new Date() } = {}) {
    this.repository = repository;
    this.createId = createId;
    this.now = now;
  }

  list(query = {}) {
    const search = typeof query.search === "string" ? query.search.trim().slice(0, 100) : "";
    const filters = {
      search,
      status: optionalChoice(query.status, ENQUIRY_STATUSES, "Status"),
      source: optionalChoice(query.source, SOURCES, "Source"),
      sort: optionalChoice(query.sort, ["newest", "oldest"], "Sort order") ?? "newest",
      page: positiveInteger(query.page, 1, 100000),
      pageSize: positiveInteger(query.pageSize, 20, 100),
    };
    const result = this.repository.listEnquiries(filters);
    return { ...result, items: result.items.map(decorate), filters };
  }

  get(id) {
    const record = this.repository.findEnquiryById(id);
    if (!record) throw new ApiError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found.");
    return decorate(record);
  }

  updateStatus(id, status) {
    if (!ENQUIRY_STATUSES.includes(status)) throw new ApiError(400, "INVALID_ENQUIRY_STATUS", "Status is invalid.");
    if (!this.repository.updateEnquiryBusinessStatus(id, status)) {
      throw new ApiError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found.");
    }
    return this.get(id);
  }

  addNote(id, body, author) {
    const normalized = typeof body === "string" ? body.trim() : "";
    if (!normalized || normalized.length > 2000) {
      throw new ApiError(400, "INVALID_ENQUIRY_NOTE", "Note must be between 1 and 2000 characters.");
    }
    if (!this.repository.findEnquiryById(id)) throw new ApiError(404, "ENQUIRY_NOT_FOUND", "Enquiry not found.");
    const note = { id: this.createId(), enquiryId: id, body: normalized, author, createdAt: this.now().toISOString() };
    this.repository.createEnquiryNote(note);
    return note;
  }
}
