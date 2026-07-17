import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { runMigrations } from "../migrations.js";

function toRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    version: row.schema_version,
    name: row.name,
    configuration: {
      modelId: row.model_id,
      fabricId: row.fabric_id,
      colourId: row.colour_id,
      size: row.size,
      legs: row.legs,
      cushions: row.cushions,
    },
    pricing: JSON.parse(row.pricing_json),
    createdAt: row.created_at,
  };
}

function parseJson(value) {
  return value ? JSON.parse(value) : null;
}

function toEnquiryRecord(row, notes = []) {
  if (!row) return null;
  return {
    id: row.id,
    source: row.source,
    customer: { name: row.customer_name, email: row.customer_email, phone: row.customer_phone },
    message: row.message,
    configuration: parseJson(row.configuration_json),
    pricing: parseJson(row.pricing_json),
    notificationStatus: row.notification_status,
    status: row.status,
    createdAt: row.created_at,
    notes,
  };
}

export class SqliteConfigurationRepository {
  constructor(databasePath) {
    if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
    runMigrations(this.database);
    this.insert = this.database.prepare(`
      INSERT INTO configurations (
        id, schema_version, name, model_id, fabric_id, colour_id, size, legs,
        cushions, pricing_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.selectById = this.database.prepare("SELECT * FROM configurations WHERE id = ?");
    this.insertEnquiry = this.database.prepare(`
      INSERT INTO enquiries (
        id, source, customer_name, customer_email, customer_phone, message,
        configuration_json, pricing_json, notification_status, created_at, submission_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.updateEnquiryStatus = this.database.prepare(
      "UPDATE enquiries SET notification_status = ? WHERE id = ?",
    );
    this.deleteExpiredEnquiries = this.database.prepare(
      "DELETE FROM enquiries WHERE created_at < ?",
    );
    this.selectEnquiryBySubmissionId = this.database.prepare(
      "SELECT id, created_at FROM enquiries WHERE submission_id = ?",
    );
    this.selectEnquiryById = this.database.prepare("SELECT * FROM enquiries WHERE id = ?");
    this.updateBusinessStatus = this.database.prepare("UPDATE enquiries SET status = ? WHERE id = ?");
    this.insertEnquiryNote = this.database.prepare(`
      INSERT INTO enquiry_notes (id, enquiry_id, body, author, created_at) VALUES (?, ?, ?, ?, ?)
    `);
    this.selectEnquiryNotes = this.database.prepare(`
      SELECT id, enquiry_id, body, author, created_at
      FROM enquiry_notes WHERE enquiry_id = ? ORDER BY created_at DESC
    `);
  }

  create(record) {
    const configuration = record.configuration;
    this.insert.run(
      record.id,
      record.version,
      record.name,
      configuration.modelId,
      configuration.fabricId,
      configuration.colourId,
      configuration.size,
      configuration.legs,
      configuration.cushions,
      JSON.stringify(record.pricing),
      record.createdAt,
    );
    return record;
  }

  findById(id) {
    return toRecord(this.selectById.get(id));
  }

  createEnquiry(record) {
    this.insertEnquiry.run(
      record.id,
      record.source,
      record.customer.name,
      record.customer.email,
      record.customer.phone,
      record.message,
      record.configuration ? JSON.stringify(record.configuration) : null,
      record.pricing ? JSON.stringify(record.pricing) : null,
      record.notificationStatus,
      record.createdAt,
      record.submissionId,
    );
    return record;
  }

  updateEnquiryNotificationStatus(id, status) {
    this.updateEnquiryStatus.run(status, id);
  }

  findEnquiryReceiptBySubmissionId(submissionId) {
    const row = this.selectEnquiryBySubmissionId.get(submissionId);
    return row ? { id: row.id, status: "received", createdAt: row.created_at } : null;
  }

  listEnquiries({ search, status, source, sort, page, pageSize }) {
    const conditions = [];
    const values = [];
    if (search) {
      conditions.push("(customer_name LIKE ? ESCAPE '\\' OR customer_email LIKE ? ESCAPE '\\' OR customer_phone LIKE ? ESCAPE '\\' OR id LIKE ? ESCAPE '\\')");
      const escaped = search.replace(/[\\%_]/gu, "\\$&");
      values.push(...Array(4).fill(`%${escaped}%`));
    }
    if (status) { conditions.push("status = ?"); values.push(status); }
    if (source) { conditions.push("source = ?"); values.push(source); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const total = this.database.prepare(`SELECT COUNT(*) AS count FROM enquiries ${where}`).get(...values).count;
    const order = sort === "oldest" ? "ASC" : "DESC";
    const rows = this.database.prepare(`
      SELECT * FROM enquiries ${where} ORDER BY created_at ${order}, id ${order} LIMIT ? OFFSET ?
    `).all(...values, pageSize, (page - 1) * pageSize);
    const statusRows = this.database.prepare("SELECT status, COUNT(*) AS count FROM enquiries GROUP BY status").all();
    const stats = Object.fromEntries(statusRows.map((row) => [row.status, row.count]));
    stats.total = statusRows.reduce((sum, row) => sum + row.count, 0);
    return { items: rows.map((row) => toEnquiryRecord(row)), total, page, pageSize, stats };
  }

  findEnquiryById(id) {
    const notes = this.selectEnquiryNotes.all(id).map((row) => ({
      id: row.id, enquiryId: row.enquiry_id, body: row.body, author: row.author, createdAt: row.created_at,
    }));
    return toEnquiryRecord(this.selectEnquiryById.get(id), notes);
  }

  updateEnquiryBusinessStatus(id, status) {
    return this.updateBusinessStatus.run(status, id).changes > 0;
  }

  createEnquiryNote(note) {
    this.insertEnquiryNote.run(note.id, note.enquiryId, note.body, note.author, note.createdAt);
    return note;
  }

  purgeEnquiriesBefore(date) {
    return this.deleteExpiredEnquiries.run(date.toISOString()).changes;
  }

  healthCheck() {
    const result = this.database.prepare("PRAGMA quick_check").get();
    return result?.quick_check === "ok";
  }

  close() {
    this.database.close();
  }
}
