-- Add 'combined' compensation type for employees with Festgehalt + Stundenlohn
-- This allows monthly salary + hourly rate for worked hours (Model C)

-- Step 1: Drop the old constraint
ALTER TABLE employee_compensation_history
DROP CONSTRAINT IF EXISTS valid_compensation;

-- Step 2: Add new constraint with 'combined' type support
ALTER TABLE employee_compensation_history
ADD CONSTRAINT valid_compensation CHECK (
    (compensation_type = 'hourly' AND hourly_rate IS NOT NULL AND monthly_salary IS NULL) OR
    (compensation_type = 'salary' AND monthly_salary IS NOT NULL AND hourly_rate IS NULL) OR
    (compensation_type = 'combined' AND monthly_salary IS NOT NULL AND hourly_rate IS NOT NULL)
);

-- Step 3: Update the CHECK constraint on compensation_type column to allow 'combined'
ALTER TABLE employee_compensation_history
DROP CONSTRAINT IF EXISTS employee_compensation_history_compensation_type_check;

ALTER TABLE employee_compensation_history
ADD CONSTRAINT employee_compensation_history_compensation_type_check
CHECK (compensation_type IN ('hourly', 'salary', 'combined'));

-- Step 4: Do the same for employee_settings table
ALTER TABLE employee_settings
DROP CONSTRAINT IF EXISTS employee_settings_compensation_type_check;

ALTER TABLE employee_settings
ADD CONSTRAINT employee_settings_compensation_type_check
CHECK (compensation_type IN ('hourly', 'salary', 'combined'));

-- Note: No data migration needed - existing 'hourly' and 'salary' records remain valid
-- New 'combined' records can now be created with both monthly_salary AND hourly_rate populated
