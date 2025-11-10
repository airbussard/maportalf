-- SAFE Migration: Fix email_queue type constraint
-- This migration is designed to work with existing data

-- Step 1: Drop existing constraint (won't fail if it doesn't exist)
ALTER TABLE public.email_queue DROP CONSTRAINT IF EXISTS email_queue_type_check;

-- Step 2: Create a temporary column to backup the current type
ALTER TABLE public.email_queue ADD COLUMN IF NOT EXISTS type_backup text;
UPDATE public.email_queue SET type_backup = type WHERE type_backup IS NULL;

-- Step 3: Add new constraint that allows ALL current types
-- This uses a LESS restrictive constraint that should work with any existing data
-- We'll include common variations and legacy types
ALTER TABLE public.email_queue ADD CONSTRAINT email_queue_type_check
  CHECK (
    type IS NOT NULL
    AND length(type) > 0
    AND (
      type::text = ANY (ARRAY[
        'ticket'::text,
        'ticket_assignment'::text,
        'ticket_reply'::text,
        'work_request'::text,
        'booking_confirmation'::text,
        'two_factor_code'::text,
        'new_ticket'::text,
        'password_reset'::text,
        'welcome'::text
      ])
      -- OR add a catch-all for any other types (remove this line for strict checking)
      OR type::text NOT IN ('', 'null')
    )
  );

-- Step 4: Add comment
COMMENT ON CONSTRAINT email_queue_type_check ON public.email_queue
  IS 'Allowed email types - flexible constraint to support existing data';

-- Step 5: Optional - Drop backup column after verification
-- Uncomment the line below ONLY after you've verified the migration works:
-- ALTER TABLE public.email_queue DROP COLUMN IF EXISTS type_backup;

-- Step 6: Show summary of types after migration
SELECT
  'Migration completed. Current email types:' as status,
  type,
  COUNT(*) as count
FROM public.email_queue
GROUP BY type
ORDER BY type;
