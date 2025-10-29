-- Migration: Add 'blocker' event type to calendar_events
-- Description: Extends event_type to support blocking events (maintenance, closures, etc.)
-- Date: 2025-10-29

-- Drop existing constraint
ALTER TABLE calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_event_type_check;

-- Add new constraint with blocker type
ALTER TABLE calendar_events
  ADD CONSTRAINT calendar_events_event_type_check
  CHECK (event_type IN ('booking', 'fi_assignment', 'blocker'));

-- Update comment
COMMENT ON COLUMN calendar_events.event_type IS 'Type of event: booking (customer booking), fi_assignment (flight instructor assignment), or blocker (maintenance, closure, etc.)';

-- Blocker events don't require instructor fields, so no additional constraints needed
-- The existing fi_events_must_have_instructor constraint only applies when event_type = 'fi_assignment'
