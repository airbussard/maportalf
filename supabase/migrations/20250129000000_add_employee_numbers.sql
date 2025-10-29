-- Add Employee Numbers to Profiles
-- Format: FH001, FH002, FH003, etc.

-- Add employee_number column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS employee_number TEXT UNIQUE;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS profiles_employee_number_idx
  ON profiles(employee_number);

-- Function to generate next employee number
CREATE OR REPLACE FUNCTION generate_employee_number()
RETURNS TEXT AS $$
DECLARE
  next_number INT;
  new_employee_number TEXT;
BEGIN
  -- Find the highest existing number
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

-- Trigger to auto-assign employee number on insert if not provided
CREATE OR REPLACE FUNCTION assign_employee_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.employee_number IS NULL THEN
    NEW.employee_number := generate_employee_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop if exists first)
DROP TRIGGER IF EXISTS trigger_assign_employee_number ON profiles;
CREATE TRIGGER trigger_assign_employee_number
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_employee_number();

-- Backfill existing profiles without employee numbers
DO $$
DECLARE
  profile_record RECORD;
  next_num INT := 1;
BEGIN
  FOR profile_record IN
    SELECT id FROM profiles WHERE employee_number IS NULL ORDER BY created_at
  LOOP
    UPDATE profiles
    SET employee_number = 'FH' || LPAD(next_num::TEXT, 3, '0')
    WHERE id = profile_record.id;
    next_num := next_num + 1;
  END LOOP;
END $$;

-- Add comment
COMMENT ON COLUMN profiles.employee_number IS 'Unique employee number in format FH001, FH002, etc.';
