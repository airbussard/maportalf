-- Migration: Fix notification_settings DEFAULT to include ticket_reply
-- Version: 2.055
-- Date: 2025-11-05
-- Description: Updates the DEFAULT value for notification_settings to include all 4 notification types

-- 1. Update the DEFAULT constraint for notification_settings column
ALTER TABLE public.profiles
ALTER COLUMN notification_settings
SET DEFAULT '{"new_ticket": true, "work_request": true, "ticket_assignment": true, "ticket_reply": true}'::jsonb;

-- 2. Update any existing profiles with NULL or incomplete notification_settings
-- This ensures all users have all 4 notification types configured
UPDATE public.profiles
SET notification_settings = jsonb_build_object(
  'new_ticket', COALESCE((notification_settings->>'new_ticket')::boolean, true),
  'work_request', COALESCE((notification_settings->>'work_request')::boolean, true),
  'ticket_assignment', COALESCE((notification_settings->>'ticket_assignment')::boolean, true),
  'ticket_reply', COALESCE((notification_settings->>'ticket_reply')::boolean, true)
)
WHERE notification_settings IS NULL
   OR NOT (notification_settings ? 'new_ticket')
   OR NOT (notification_settings ? 'work_request')
   OR NOT (notification_settings ? 'ticket_assignment')
   OR NOT (notification_settings ? 'ticket_reply');

-- 3. Verify migration
DO $$
DECLARE
  total_users INTEGER;
  users_with_settings INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.profiles;

  SELECT COUNT(*) INTO users_with_settings
  FROM public.profiles
  WHERE notification_settings ? 'new_ticket'
    AND notification_settings ? 'work_request'
    AND notification_settings ? 'ticket_assignment'
    AND notification_settings ? 'ticket_reply';

  RAISE NOTICE 'Migration erfolgreich abgeschlossen!';
  RAISE NOTICE '  - DEFAULT für notification_settings aktualisiert (4 Typen)';
  RAISE NOTICE '  - % von % Benutzern haben vollständige Einstellungen', users_with_settings, total_users;

  IF users_with_settings < total_users THEN
    RAISE WARNING '% Benutzer haben unvollständige notification_settings!', (total_users - users_with_settings);
  END IF;
END $$;
