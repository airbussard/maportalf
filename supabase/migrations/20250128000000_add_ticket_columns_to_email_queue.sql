-- Add ticket-specific columns to email_queue table
-- This extends the existing email_queue table to support ticket email functionality

-- Add ticket_id column
ALTER TABLE email_queue
ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE;

-- Add recipient_email column (in addition to existing 'recipient')
ALTER TABLE email_queue
ADD COLUMN IF NOT EXISTS recipient_email TEXT;

-- Add content column (in addition to existing 'body')
ALTER TABLE email_queue
ADD COLUMN IF NOT EXISTS content TEXT;

-- Add last_attempt_at column
ALTER TABLE email_queue
ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

-- Create index for efficient ticket queries
CREATE INDEX IF NOT EXISTS idx_email_queue_ticket_id_new ON email_queue(ticket_id);

-- Comments
COMMENT ON COLUMN email_queue.ticket_id IS 'Reference to ticket if this email is related to a ticket';
COMMENT ON COLUMN email_queue.recipient_email IS 'Ticket-specific recipient email field';
COMMENT ON COLUMN email_queue.content IS 'Ticket-specific content field (alternative to body)';
COMMENT ON COLUMN email_queue.last_attempt_at IS 'Timestamp of last send attempt';
