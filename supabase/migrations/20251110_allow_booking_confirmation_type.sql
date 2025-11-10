-- Allow 'booking_confirmation' type in email_queue
-- This is required for booking confirmation emails with Pocket Guide PDF attachment

ALTER TABLE email_queue DROP CONSTRAINT IF EXISTS email_queue_type_check;

ALTER TABLE email_queue ADD CONSTRAINT email_queue_type_check
  CHECK (type IN ('ticket', 'ticket_assignment', 'work_request', 'ticket_reply', 'booking_confirmation'));

COMMENT ON CONSTRAINT email_queue_type_check ON email_queue IS
  'Allowed email types: ticket, ticket_assignment, work_request, ticket_reply, booking_confirmation';
