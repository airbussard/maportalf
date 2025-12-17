-- Add fields to track when a cancelled event was rebooked by customer
-- Used to mark cancellations as "resolved" in the Absagen page

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS rebooked_at TIMESTAMPTZ;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS rebooked_event_id TEXT;

COMMENT ON COLUMN calendar_events.rebooked_at IS 'Wann wurde diese Absage durch Kundenbuchung erledigt';
COMMENT ON COLUMN calendar_events.rebooked_event_id IS 'ID des neuen Termins nach Umbuchung';
