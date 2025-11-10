/**
 * Fix email_queue foreign key to use google_event_id instead of id
 *
 * Problem: Current FK references calendar_events.id (TEXT primary key)
 * When calendar sync updates events, it tries to change the ID, causing FK violations
 *
 * Solution: Use calendar_events.google_event_id as FK reference instead
 * This is stable across syncs and won't cause violations
 */

-- Step 1: Drop existing foreign key constraint
ALTER TABLE email_queue
DROP CONSTRAINT IF EXISTS email_queue_event_id_fkey;

-- Step 2: Add new column for google_event_id reference
ALTER TABLE email_queue
ADD COLUMN IF NOT EXISTS calendar_google_event_id TEXT;

-- Step 3: Migrate existing data (event_id → google_event_id)
-- Populate calendar_google_event_id from existing event_id relationships
UPDATE email_queue eq
SET calendar_google_event_id = ce.google_event_id
FROM calendar_events ce
WHERE eq.event_id = ce.id
  AND eq.calendar_google_event_id IS NULL;

-- Step 4: Mark old event_id column as deprecated (keep for backwards compatibility)
COMMENT ON COLUMN email_queue.event_id IS 'DEPRECATED: Use calendar_google_event_id instead. Will be removed in future version.';

-- Step 5: Create new foreign key constraint on google_event_id
ALTER TABLE email_queue
ADD CONSTRAINT email_queue_calendar_google_event_id_fkey
FOREIGN KEY (calendar_google_event_id)
REFERENCES calendar_events(google_event_id)
ON DELETE SET NULL;

-- Step 6: Create index for performance
CREATE INDEX IF NOT EXISTS idx_email_queue_calendar_google_event_id
ON email_queue(calendar_google_event_id)
WHERE calendar_google_event_id IS NOT NULL;

-- Step 7: Add unique constraint to google_event_id (required for FK)
-- First check if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'calendar_events_google_event_id_key'
  ) THEN
    ALTER TABLE calendar_events
    ADD CONSTRAINT calendar_events_google_event_id_key UNIQUE (google_event_id);
  END IF;
END $$;

-- Comments for documentation
COMMENT ON COLUMN email_queue.calendar_google_event_id IS 'Google Calendar event ID - stable reference that does not change during sync operations';
COMMENT ON CONSTRAINT email_queue_calendar_google_event_id_fkey ON email_queue IS 'References calendar_events by google_event_id to avoid FK violations during sync';
