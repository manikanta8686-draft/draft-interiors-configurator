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

  close() {
    this.database.close();
  }
}
