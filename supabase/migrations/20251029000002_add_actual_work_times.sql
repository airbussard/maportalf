-- Add actual work time fields for FI events with time restrictions
-- These fields store the actual work hours (e.g., 09:00-17:00)
-- while start_time/end_time remain fixed at 08:00-09:00 for Google Calendar display

ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS actual_work_start_time TIME,
ADD COLUMN IF NOT EXISTS actual_work_end_time TIME;

-- Add comments for documentation
COMMENT ON COLUMN calendar_events.actual_work_start_time IS 'Tatsächliche Arbeitsstart-Zeit für FI-Events (wenn nicht ganztägig). Format: HH:MM:SS';
COMMENT ON COLUMN calendar_events.actual_work_end_time IS 'Tatsächliche Arbeitsend-Zeit für FI-Events (wenn nicht ganztägig). Format: HH:MM:SS';

-- Migration for existing FI events: Parse times from remarks field
-- Example remarks: "Arbeitstag von 09:00 bis 17:00 (genehmigter Request)"
UPDATE calendar_events
SET
  actual_work_start_time = CASE
    WHEN remarks ~ 'Arbeitstag von \d{2}:\d{2} bis \d{2}:\d{2}' THEN
      (regexp_match(remarks, 'Arbeitstag von (\d{2}:\d{2}) bis'))[1]::TIME
    ELSE NULL
  END,
  actual_work_end_time = CASE
    WHEN remarks ~ 'Arbeitstag von \d{2}:\d{2} bis \d{2}:\d{2}' THEN
      (regexp_match(remarks, 'bis (\d{2}:\d{2})'))[1]::TIME
    ELSE NULL
  END
WHERE event_type = 'fi_assignment'
  AND remarks IS NOT NULL
  AND remarks LIKE '%Arbeitstag von%bis%';

-- Update is_all_day flag for existing FI events
-- If remarks says "Ganztägiger Arbeitstag", mark as all-day
UPDATE calendar_events
SET is_all_day = TRUE
WHERE event_type = 'fi_assignment'
  AND remarks LIKE '%Ganztägiger Arbeitstag%'
  AND is_all_day IS FALSE;
