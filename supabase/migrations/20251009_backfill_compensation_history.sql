-- Backfill compensation history for existing employee settings
-- This ensures that the get_employee_compensation RPC function works for all employees

INSERT INTO employee_compensation_history (
  employee_id,
  compensation_type,
  hourly_rate,
  monthly_salary,
  currency,
  valid_from,
  created_by,
  reason
)
SELECT
  es.employee_id,
  es.compensation_type,
  es.hourly_rate,
  es.monthly_salary,
  es.currency,
  CURRENT_DATE - INTERVAL '1 day' as valid_from, -- Set to yesterday to ensure it's valid for current reports
  es.updated_by,
  'Backfilled from employee_settings during migration'
FROM employee_settings es
WHERE NOT EXISTS (
  -- Only insert if no history entry exists for this employee
  SELECT 1
  FROM employee_compensation_history ech
  WHERE ech.employee_id = es.employee_id
);
