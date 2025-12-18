-- Migration: Add pending shift fields to calendar_events
-- Version: 2.146
-- Date: 2024-12-18
-- Description: Adds fields to track pending shifts that await customer confirmation

-- ============================================
-- 1. Add pending shift columns to calendar_events
-- ============================================

-- Pending start time (not yet applied, awaiting confirmation)
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS pending_start_time TIMESTAMPTZ;

-- Pending end time (not yet applied, awaiting confirmation)
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS pending_end_time TIMESTAMPTZ;

-- When the shift notification was sent to customer
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS shift_notified_at TIMESTAMPTZ;

-- Reason for the shift (human-readable text)
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS shift_reason TEXT;

-- ============================================
-- 2. Add tracking columns to mayday_confirmation_tokens
-- ============================================

-- Whether the shift was actually applied to the calendar event
ALTER TABLE mayday_confirmation_tokens ADD COLUMN IF NOT EXISTS shift_applied BOOLEAN DEFAULT false;

-- When the shift was applied
ALTER TABLE mayday_confirmation_tokens ADD COLUMN IF NOT EXISTS shift_applied_at TIMESTAMPTZ;

-- ============================================
-- 3. Create index for efficient querying
-- ============================================

-- Index for finding events with pending shifts
CREATE INDEX IF NOT EXISTS idx_calendar_events_pending_shift
  ON calendar_events(id)
  WHERE pending_start_time IS NOT NULL;

-- ============================================
-- 4. Add column comments for documentation
-- ============================================

COMMENT ON COLUMN calendar_events.pending_start_time IS 'New start time after shift - pending customer confirmation. NULL if no pending shift.';
COMMENT ON COLUMN calendar_events.pending_end_time IS 'New end time after shift - pending customer confirmation. NULL if no pending shift.';
COMMENT ON COLUMN calendar_events.shift_notified_at IS 'When the shift notification was sent to customer via email/SMS.';
COMMENT ON COLUMN calendar_events.shift_reason IS 'Human-readable reason for the shift (from MAYDAY_REASONS).';

COMMENT ON COLUMN mayday_confirmation_tokens.shift_applied IS 'Whether the shift was actually applied to the calendar event after confirmation.';
COMMENT ON COLUMN mayday_confirmation_tokens.shift_applied_at IS 'When the shift was applied to the calendar event.';
