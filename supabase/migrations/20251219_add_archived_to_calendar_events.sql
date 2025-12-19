-- Migration: Add archived_at column to calendar_events
-- Version: 2.154
-- Date: 2024-12-19
-- Purpose: Enable soft-delete archiving for cancelled events

-- Add archived_at column
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- Index for filtering out archived events (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_calendar_events_archived ON calendar_events(archived_at) WHERE archived_at IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN calendar_events.archived_at IS 'Timestamp when this event was archived (soft-delete for cancelled events)';
