-- Simplify compensation tracking by storing snapshots in time_reports
-- Instead of maintaining complex history table, we store compensation data
-- directly in the monthly report when it's closed

-- Step 1: Add compensation fields to time_reports table
ALTER TABLE time_reports
ADD COLUMN IF NOT EXISTS compensation_type TEXT CHECK (compensation_type IN ('hourly', 'salary', 'combined')),
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS monthly_salary DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS compensation_snapshot JSONB DEFAULT '{}'::jsonb;

-- Step 2: Add comments for documentation
COMMENT ON COLUMN time_reports.compensation_type IS 'Snapshot of employee compensation type at time of month closure';
COMMENT ON COLUMN time_reports.hourly_rate IS 'Snapshot of hourly rate at time of month closure';
COMMENT ON COLUMN time_reports.monthly_salary IS 'Snapshot of monthly salary at time of month closure';
COMMENT ON COLUMN time_reports.compensation_snapshot IS 'Full compensation data snapshot as JSON for flexibility';

-- Step 3: Backfill existing closed reports with current employee_settings data
-- This attempts to populate historical data where possible
UPDATE time_reports tr
SET
  compensation_type = es.compensation_type,
  hourly_rate = es.hourly_rate,
  monthly_salary = es.monthly_salary,
  compensation_snapshot = jsonb_build_object(
    'compensation_type', es.compensation_type,
    'hourly_rate', es.hourly_rate,
    'monthly_salary', es.monthly_salary,
    'currency', es.currency,
    'backfilled', true,
    'backfilled_at', NOW()
  )
FROM employee_settings es
WHERE tr.employee_id = es.employee_id
  AND tr.is_closed = true
  AND tr.compensation_type IS NULL;  -- Only update if not already set

-- Step 4: Log the backfill results
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled compensation data for % closed reports', updated_count;
END $$;

-- Step 5: Note about old system
-- The employee_compensation_history table is now deprecated
-- It will not be used by the application anymore
-- We keep it for historical reference but new code ignores it
COMMENT ON TABLE employee_compensation_history IS 'DEPRECATED: No longer used. Compensation data now stored as snapshots in time_reports table.';
