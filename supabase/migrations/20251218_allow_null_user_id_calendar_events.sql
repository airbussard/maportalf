-- Allow NULL user_id in calendar_events for public bookings (rebook portal)
-- Previously: user_id was NOT NULL
-- Now: user_id can be NULL for events created via public booking portals

ALTER TABLE calendar_events ALTER COLUMN user_id DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN calendar_events.user_id IS 'User who created/owns the event. NULL for events created via public portals (e.g., rebook)';
