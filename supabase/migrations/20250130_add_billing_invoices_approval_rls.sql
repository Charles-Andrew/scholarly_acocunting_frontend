-- Add RLS to billing_invoices if not already enabled
ALTER TABLE IF EXISTS billing_invoices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow approval only by assigned approver" ON billing_invoices;

-- Create policy: Only the assigned approver can update invoices when status is 'for_approval'
-- and can only change status to 'approved'
CREATE POLICY "Allow approval only by assigned approver" ON billing_invoices
  FOR UPDATE
  USING (
    -- User must be the assigned approver
    approved_by = auth.uid() AND
    -- Invoice must be in 'for_approval' status
    status = 'for_approval' AND
    -- Only allow changing to 'approved' status
    (new.status = 'approved' OR new.status = status)
  )
  WITH CHECK (
    -- Same rules for INSERT/UPDATE
    approved_by = auth.uid() AND
    status = 'for_approval'
  );
