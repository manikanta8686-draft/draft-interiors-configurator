CREATE TABLE configurations (
  id TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL,
  name TEXT,
  model_id TEXT NOT NULL,
  fabric_id TEXT NOT NULL,
  colour_id TEXT NOT NULL,
  size TEXT NOT NULL,
  legs TEXT NOT NULL,
  cushions INTEGER NOT NULL,
  pricing_json TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;
