-- Fix Race Condition in Employee Number Generation
-- Issue: Concurrent inserts could generate duplicate employee numbers
-- Solution: Use advisory lock to ensure thread-safe number generation

-- Drop and recreate the function with advisory lock
CREATE OR REPLACE FUNCTION generate_employee_number()
RETURNS TEXT AS $$
DECLARE
  next_number INT;
  new_employee_number TEXT;
BEGIN
  -- Acquire advisory lock (ensures only one transaction generates a number at a time)
  -- Lock ID: 123456789 (arbitrary but consistent)
  PERFORM pg_advisory_xact_lock(123456789);

  -- Find the highest existing number (now protected by lock)
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(employee_number FROM 3) AS INT
      )
    ),
    0
  ) INTO next_number
  FROM profiles
  WHERE employee_number ~ '^FH[0-9]{3}$';

  -- Increment and format
  next_number := next_number + 1;
  new_employee_number := 'FH' || LPAD(next_number::TEXT, 3, '0');

  RETURN new_employee_number;
END;
$$ LANGUAGE plpgsql;

-- Comment on the fix
COMMENT ON FUNCTION generate_employee_number() IS 'Thread-safe employee number generator using advisory lock to prevent race conditions';
