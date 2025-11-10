/**
 * Verification Tokens Table
 *
 * Purpose: Temporary tokens for completing 2FA authentication
 * After successful 2FA code verification, a token is generated
 * This token is used to create a session without re-entering password
 *
 * Security:
 * - Tokens expire after 10 minutes
 * - Tokens are single-use (marked as 'used' after consumption)
 * - Auto-cleanup of expired tokens via cron job
 */

-- Create verification_tokens table
CREATE TABLE IF NOT EXISTS verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_verification_tokens_token
ON verification_tokens(token) WHERE used = FALSE;

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires_at
ON verification_tokens(expires_at) WHERE used = FALSE;

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id
ON verification_tokens(user_id);

-- Row Level Security
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tokens (for debugging)
CREATE POLICY "Users can view their own tokens"
ON verification_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Service role can manage all tokens (for server actions)
CREATE POLICY "Service role can manage tokens"
ON verification_tokens
FOR ALL
USING (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE verification_tokens IS 'Temporary tokens for completing 2FA authentication flow';
COMMENT ON COLUMN verification_tokens.token IS 'UUID token passed via URL for session creation';
COMMENT ON COLUMN verification_tokens.expires_at IS 'Token expiration time (10 minutes from creation)';
COMMENT ON COLUMN verification_tokens.used IS 'Whether token has been consumed (single-use)';
COMMENT ON COLUMN verification_tokens.ip_address IS 'IP address of token creation for security logging';
COMMENT ON COLUMN verification_tokens.user_agent IS 'User agent of token creation for security logging';
COMMENT ON COLUMN verification_tokens.used_at IS 'Timestamp when token was consumed';
