-- Migration: Create sms_queue table for MAYDAY SMS notifications
-- Phase 6 of MAYDAY Center implementation
-- Uses Twilio for SMS delivery

CREATE TABLE sms_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  event_id TEXT,  -- Reference to calendar_events.id
  notification_type TEXT CHECK (notification_type IN ('shift', 'cancel')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  twilio_message_id TEXT,  -- Twilio message SID for tracking
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Index for efficient processing of pending SMS
CREATE INDEX idx_sms_queue_status ON sms_queue(status) WHERE status = 'pending';

-- Index for finding SMS by event
CREATE INDEX idx_sms_queue_event ON sms_queue(event_id);

-- Comment for documentation
COMMENT ON TABLE sms_queue IS 'Queue for MAYDAY SMS notifications via Twilio';
COMMENT ON COLUMN sms_queue.phone_number IS 'Customer phone number in international format (+49...)';
COMMENT ON COLUMN sms_queue.message IS 'SMS message content (max 160 chars for single SMS)';
COMMENT ON COLUMN sms_queue.twilio_message_id IS 'Twilio message SID returned after successful send';
COMMENT ON COLUMN sms_queue.attempts IS 'Number of send attempts (max 3 before marking as failed)';
