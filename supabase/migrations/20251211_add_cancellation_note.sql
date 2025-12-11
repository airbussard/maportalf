-- Migration: Add cancellation note field to calendar_events
-- Version: 2.109

-- Add cancellation_note field for free-text cancellation reason
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS cancellation_note TEXT;

-- Comment for documentation
COMMENT ON COLUMN calendar_events.cancellation_note IS 'Free-text reason/note for the cancellation';
