-- Add message_id to email_queue for ticket reply attachments
-- This allows the queue processor to find attachments linked to specific messages

ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES ticket_messages(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_email_queue_message_id ON email_queue(message_id);

-- Add comment for documentation
COMMENT ON COLUMN email_queue.message_id IS 'Reference to ticket_messages for linking reply attachments. NULL for initial ticket creation.';
