-- Add bonus_amount column to time_reports for ON TOP bonus feature
-- This allows admins to add a monthly bonus that affects the total hours calculation
-- Backwards compatible with existing PHP system (DEFAULT 0)

ALTER TABLE time_reports
ADD COLUMN IF NOT EXISTS bonus_amount DECIMAL(10, 2) DEFAULT 0
CONSTRAINT bonus_amount_non_negative CHECK (bonus_amount >= 0);

-- Add comment for documentation
COMMENT ON COLUMN time_reports.bonus_amount IS 'Monthly bonus amount (ON TOP) added to base salary before calculating hours';
