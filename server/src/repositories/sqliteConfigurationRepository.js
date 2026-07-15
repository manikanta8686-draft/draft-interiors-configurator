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

  purgeEnquiriesBefore(date) {
    return this.deleteExpiredEnquiries.run(date.toISOString()).changes;
  }

  close() {
    this.database.close();
  }
}
