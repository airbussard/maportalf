-- Email Queue System for Background Email Processing
-- Prevents timeout issues and provides admin monitoring

-- Create email_queue table
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_ticket_id ON email_queue(ticket_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_created_at ON email_queue(created_at DESC);

-- Enable RLS
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Policy: Managers and Admins can view all emails
CREATE POLICY "Managers and Admins can view email queue"
  ON email_queue
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- Policy: System can insert (for ticket creation)
CREATE POLICY "Authenticated users can insert to queue"
  ON email_queue
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: System can update (for queue processor)
CREATE POLICY "Service role can update queue"
  ON email_queue
  FOR UPDATE
  USING (true);

-- Function to clean up old sent emails (optional, run manually or via cron)
CREATE OR REPLACE FUNCTION cleanup_old_email_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete successfully sent emails older than 30 days
  DELETE FROM email_queue
  WHERE status = 'sent'
  AND sent_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Comments
COMMENT ON TABLE email_queue IS 'Queue for background email processing with retry mechanism';
COMMENT ON COLUMN email_queue.status IS 'pending: waiting to send, sending: currently processing, sent: successfully sent, failed: all retries exhausted';
COMMENT ON COLUMN email_queue.attempts IS 'Number of send attempts made';
COMMENT ON COLUMN email_queue.max_attempts IS 'Maximum retry attempts before marking as failed';
