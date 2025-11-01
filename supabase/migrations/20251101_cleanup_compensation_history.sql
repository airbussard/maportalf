-- Cleanup duplicate compensation history entries
-- This script fixes the issue where multiple entries exist with valid_to = NULL
-- by closing old entries and keeping only the most recent one open

-- Step 1: For each employee, find all their open history entries (valid_to IS NULL)
-- and close all but the most recent one

-- Create a temporary view to identify which entries should be closed
WITH ranked_entries AS (
  SELECT
    id,
    employee_id,
    valid_from,
    created_at,
    -- Rank by valid_from DESC, created_at DESC - newest first
    ROW_NUMBER() OVER (
      PARTITION BY employee_id
      ORDER BY valid_from DESC, created_at DESC
    ) AS rn
  FROM employee_compensation_history
  WHERE valid_to IS NULL  -- Only look at open entries
),
entries_to_close AS (
  SELECT
    id,
    employee_id,
    valid_from
  FROM ranked_entries
  WHERE rn > 1  -- All except the newest one (rn = 1)
)
-- Update entries that should be closed
UPDATE employee_compensation_history ech
SET valid_to = (
  -- Set valid_to to the day before the entry's valid_from
  SELECT (etc.valid_from::date - INTERVAL '1 day')::date
  FROM entries_to_close etc
  WHERE etc.id = ech.id
)
WHERE id IN (SELECT id FROM entries_to_close);

-- Step 2: Log what we did
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Closed % old compensation history entries', updated_count;
END $$;

-- Step 3: Verify cleanup - this should return 0 or 1 per employee
-- (If it returns more than 1 for any employee, there's still a problem)
DO $$
DECLARE
  problem_employees INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO problem_employees
  FROM (
    SELECT employee_id, COUNT(*) as open_count
    FROM employee_compensation_history
    WHERE valid_to IS NULL
    GROUP BY employee_id
    HAVING COUNT(*) > 1
  ) subquery;

  IF problem_employees > 0 THEN
    RAISE WARNING '% employees still have multiple open history entries', problem_employees;
  ELSE
    RAISE NOTICE 'Cleanup successful - all employees have at most 1 open history entry';
  END IF;
END $$;
