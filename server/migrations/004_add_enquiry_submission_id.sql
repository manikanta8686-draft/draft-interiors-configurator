ALTER TABLE enquiries ADD COLUMN submission_id TEXT;

CREATE UNIQUE INDEX enquiries_submission_id_unique
ON enquiries(submission_id)
WHERE submission_id IS NOT NULL;
