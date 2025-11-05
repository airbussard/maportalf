-- Add notification preferences to profiles table
-- Allows Manager/Admin users to choose which in-app notifications they want to receive

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"new_ticket": true, "work_request": true, "ticket_assignment": true}'::jsonb;

-- Add index for JSONB queries (optional but good for performance)
CREATE INDEX IF NOT EXISTS idx_profiles_notification_settings
ON profiles USING gin(notification_settings);

-- Add comment for documentation
COMMENT ON COLUMN profiles.notification_settings IS 'User preferences for in-app notifications (Manager/Admin only). Keys: new_ticket, work_request, ticket_assignment';
