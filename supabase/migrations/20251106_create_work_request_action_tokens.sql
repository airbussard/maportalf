-- Create table for work request action tokens (approve/reject via email)
-- Tokens are valid for 7 days and can only be used once

CREATE TABLE IF NOT EXISTS work_request_action_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID NOT NULL UNIQUE,
  work_request_id UUID NOT NULL REFERENCES work_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject')),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_action_tokens_token ON work_request_action_tokens(token);
CREATE INDEX IF NOT EXISTS idx_action_tokens_work_request ON work_request_action_tokens(work_request_id);
CREATE INDEX IF NOT EXISTS idx_action_tokens_expires_at ON work_request_action_tokens(expires_at);

-- No RLS needed - this is accessed via API routes with service role

-- Add comment for documentation
COMMENT ON TABLE work_request_action_tokens IS 'One-time tokens for approving/rejecting work requests via email links';
COMMENT ON COLUMN work_request_action_tokens.expires_at IS 'Token expiry date (default: 7 days from creation)';
COMMENT ON COLUMN work_request_action_tokens.used IS 'Whether the token has been used (one-time use only)';
