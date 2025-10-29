-- Add Flight Instructor (FI) Event Support to Calendar
-- Allows assigning instructors to calendar days

-- Add new columns to calendar_events
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'booking' CHECK (event_type IN ('booking', 'fi_assignment')),
  ADD COLUMN IF NOT EXISTS assigned_instructor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_instructor_number TEXT,
  ADD COLUMN IF NOT EXISTS assigned_instructor_name TEXT,
  ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS request_id UUID;

-- Add indices for performance
CREATE INDEX IF NOT EXISTS calendar_events_event_type_idx
  ON calendar_events(event_type);

CREATE INDEX IF NOT EXISTS calendar_events_assigned_instructor_id_idx
  ON calendar_events(assigned_instructor_id)
  WHERE assigned_instructor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS calendar_events_request_id_idx
  ON calendar_events(request_id)
  WHERE request_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN calendar_events.event_type IS 'Type of event: booking (customer booking) or fi_assignment (flight instructor assignment)';
COMMENT ON COLUMN calendar_events.assigned_instructor_id IS 'Profile ID of assigned instructor (for FI events)';
COMMENT ON COLUMN calendar_events.assigned_instructor_number IS 'Employee number of assigned instructor (FH001, FH002, etc.)';
COMMENT ON COLUMN calendar_events.assigned_instructor_name IS 'Name of assigned instructor (from DB or freetext)';
COMMENT ON COLUMN calendar_events.is_all_day IS 'Whether the FI assignment is for the full day (no specific time)';
COMMENT ON COLUMN calendar_events.request_id IS 'Link to request that created this event (for future integration)';

-- Validation: FI events must have instructor info
ALTER TABLE calendar_events
  ADD CONSTRAINT fi_events_must_have_instructor
  CHECK (
    event_type != 'fi_assignment' OR
    (assigned_instructor_name IS NOT NULL AND assigned_instructor_name != '')
  );
