-- Migration: Add 'ticket_reply' notification type
-- Version: 2.054
-- Date: 2025-11-05
-- Description: Adds ticket_reply to allowed notification types and updates all user preferences

-- 1. Drop existing CHECK constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. Add updated CHECK constraint with ticket_reply
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
CHECK (type = ANY (ARRAY[
  'new_ticket'::text,
  'work_request'::text,
  'ticket_assignment'::text,
  'ticket_reply'::text
]));

-- 3. Update existing notification_settings for all users to include ticket_reply (enabled by default)
UPDATE public.profiles
SET notification_settings = jsonb_set(
  COALESCE(notification_settings, '{}'::jsonb),
  '{ticket_reply}',
  'true'
)
WHERE notification_settings IS NULL
   OR NOT notification_settings ? 'ticket_reply';

-- 4. Verify migration
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM public.profiles
  WHERE notification_settings ? 'ticket_reply';

  RAISE NOTICE 'Migration erfolgreich abgeschlossen!';
  RAISE NOTICE '  - CHECK Constraint aktualisiert: ticket_reply erlaubt';
  RAISE NOTICE '  - % Benutzer mit ticket_reply Einstellung aktualisiert', updated_count;
END $$;
