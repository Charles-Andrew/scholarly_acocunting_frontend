ALTER TABLE billing_invoices
ADD COLUMN IF NOT EXISTS due_date date;

UPDATE billing_invoices
SET due_date = (date::date + INTERVAL '30 days')::date
WHERE due_date IS NULL;

ALTER TABLE billing_invoices
ALTER COLUMN due_date SET NOT NULL;
