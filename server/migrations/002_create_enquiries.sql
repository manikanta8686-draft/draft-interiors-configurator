CREATE TABLE enquiries (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('contact', 'configurator')),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  message TEXT NOT NULL,
  configuration_json TEXT,
  pricing_json TEXT,
  notification_status TEXT NOT NULL CHECK (
    notification_status IN ('pending', 'delivered', 'failed', 'not_configured')
  ),
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX enquiries_created_at_idx ON enquiries(created_at);
