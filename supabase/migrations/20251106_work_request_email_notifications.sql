-- Add email notification preference for work requests
-- This allows users to opt-in to receive work request emails

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS receive_request_emails BOOLEAN DEFAULT false;

-- Create index for performance when querying users who want emails
CREATE INDEX IF NOT EXISTS idx_profiles_receive_request_emails
ON profiles(receive_request_emails)
WHERE receive_request_emails = true;

-- Add comment for documentation
COMMENT ON COLUMN profiles.receive_request_emails IS 'User receives email notifications for new work requests (Manager/Admin only)';
