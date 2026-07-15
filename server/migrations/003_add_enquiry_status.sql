ALTER TABLE enquiries
ADD COLUMN status TEXT NOT NULL DEFAULT 'new'
CHECK (status IN ('new', 'contacted', 'qualified', 'closed'));
