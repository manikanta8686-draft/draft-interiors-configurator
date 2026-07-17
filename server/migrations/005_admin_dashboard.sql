CREATE TABLE enquiries_admin_v2 (
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
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'contacted', 'quote_sent', 'negotiating', 'confirmed', 'closed')
  ),
  submission_id TEXT
) STRICT;

INSERT INTO enquiries_admin_v2 (
  id, source, customer_name, customer_email, customer_phone, message,
  configuration_json, pricing_json, notification_status, created_at, status, submission_id
)
SELECT
  id, source, customer_name, customer_email, customer_phone, message,
  configuration_json, pricing_json, notification_status, created_at,
  CASE status WHEN 'qualified' THEN 'negotiating' ELSE status END,
  submission_id
FROM enquiries;

DROP TABLE enquiries;
ALTER TABLE enquiries_admin_v2 RENAME TO enquiries;

CREATE INDEX enquiries_created_at_idx ON enquiries(created_at);
CREATE INDEX enquiries_status_idx ON enquiries(status);
CREATE UNIQUE INDEX enquiries_submission_id_unique
ON enquiries(submission_id)
WHERE submission_id IS NOT NULL;

CREATE TABLE enquiry_notes (
  id TEXT PRIMARY KEY,
  enquiry_id TEXT NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  author TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX enquiry_notes_enquiry_created_idx ON enquiry_notes(enquiry_id, created_at DESC);
