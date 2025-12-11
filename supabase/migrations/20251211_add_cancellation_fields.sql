-- Migration: Add cancellation tracking fields to calendar_events
-- Version: 2.107

-- Add cancellation fields
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add check constraint for cancellation_reason
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'calendar_events_cancellation_reason_check'
    ) THEN
        ALTER TABLE calendar_events
        ADD CONSTRAINT calendar_events_cancellation_reason_check
        CHECK (
            cancellation_reason IS NULL OR
            cancellation_reason IN ('cancelled_by_us', 'cancelled_by_customer')
        );
    END IF;
END $$;

-- Create index for efficient cancellations page queries
CREATE INDEX IF NOT EXISTS idx_calendar_events_cancelled
ON calendar_events(cancellation_reason, cancelled_at DESC)
WHERE cancellation_reason IS NOT NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN calendar_events.cancelled_at IS 'Timestamp when the event was cancelled';
COMMENT ON COLUMN calendar_events.cancelled_by IS 'User ID who cancelled the event';
COMMENT ON COLUMN calendar_events.cancellation_reason IS 'Reason for cancellation: cancelled_by_us or cancelled_by_customer';
