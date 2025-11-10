-- Add 'two_factor_code' to email_queue type constraint
-- This allows 2FA codes to be sent via the email queue system

ALTER TABLE public.email_queue DROP CONSTRAINT IF EXISTS email_queue_type_check;

ALTER TABLE public.email_queue ADD CONSTRAINT email_queue_type_check
  CHECK (type IN (
    'ticket',
    'ticket_assignment',
    'work_request',
    'ticket_reply',
    'booking_confirmation',
    'two_factor_code'
  ));

-- Comment on constraint
COMMENT ON CONSTRAINT email_queue_type_check ON public.email_queue IS 'Allowed email types including 2FA codes';
