-- DIAGNOSE: Check what email types currently exist in the database
-- Run this FIRST to see what types are in your email_queue table

-- Step 1: Show all unique types currently in the table
SELECT
  type,
  COUNT(*) as count,
  MIN(created_at) as first_occurrence,
  MAX(created_at) as last_occurrence
FROM public.email_queue
GROUP BY type
ORDER BY type;

-- Step 2: Show the current constraint (if any)
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.email_queue'::regclass
  AND conname = 'email_queue_type_check';

-- Step 3: Show any rows that would violate the new constraint
-- (Uncomment the types you DON'T want to allow)
SELECT
  id,
  type,
  recipient_email,
  subject,
  status,
  created_at
FROM public.email_queue
WHERE type NOT IN (
  'ticket',
  'ticket_assignment',
  'work_request',
  'ticket_reply',
  'booking_confirmation',
  'two_factor_code'
  -- Add any other types you find above
)
ORDER BY created_at DESC
LIMIT 20;
