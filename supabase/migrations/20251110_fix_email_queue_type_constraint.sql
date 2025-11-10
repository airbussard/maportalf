-- Fix email_queue type constraint to include all current email types
-- This migration ensures that all email types (including two_factor_code) are allowed

-- Drop existing constraint if it exists
ALTER TABLE public.email_queue DROP CONSTRAINT IF EXISTS email_queue_type_check;

-- Add updated constraint with all email types
ALTER TABLE public.email_queue ADD CONSTRAINT email_queue_type_check
  CHECK (type::text = ANY (ARRAY[
    'ticket'::text,
    'ticket_assignment'::text,
    'work_request'::text,
    'ticket_reply'::text,
    'booking_confirmation'::text,
    'two_factor_code'::text
  ]));

-- Add comment
COMMENT ON CONSTRAINT email_queue_type_check ON public.email_queue
  IS 'Allowed email types: ticket, ticket_assignment, work_request, ticket_reply, booking_confirmation, two_factor_code';
