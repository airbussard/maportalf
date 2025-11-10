-- Add event_id to link booking confirmations to calendar events
ALTER TABLE email_queue
ADD COLUMN IF NOT EXISTS event_id TEXT REFERENCES calendar_events(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_email_queue_event_id ON email_queue(event_id);

-- Add comment
COMMENT ON COLUMN email_queue.event_id IS 'Links to calendar_events for booking confirmations';
