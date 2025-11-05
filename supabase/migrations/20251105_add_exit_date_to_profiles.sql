-- Add exit_date to profiles for better employee lifecycle management
-- Replaces simple is_active boolean with date-based system
-- Allows employees to remain visible in time tracking until their exit month

-- Add exit_date column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS exit_date DATE NULL;

-- Add index for performance (filtering by exit_date will be common)
CREATE INDEX IF NOT EXISTS profiles_exit_date_idx ON profiles(exit_date);

-- Add helpful comment
COMMENT ON COLUMN profiles.exit_date IS 'Date when employee leaves/left the company. NULL means still employed. Used for access control and time tracking visibility.';

-- Note: is_active column remains for backward compatibility but is deprecated
-- New logic: Employee is inactive if (is_active = false) OR (exit_date IS NOT NULL AND exit_date <= CURRENT_DATE)

-- Verify the change
DO $$
BEGIN
  RAISE NOTICE '=== EXIT DATE COLUMN ADDED ===';
  RAISE NOTICE 'Column: profiles.exit_date (DATE NULL)';
  RAISE NOTICE 'Index: profiles_exit_date_idx';
  RAISE NOTICE 'Logic: Inactive if exit_date <= today OR is_active = false';
  RAISE NOTICE 'Backward compatible: is_active still works';
  RAISE NOTICE '================================';
END $$;
