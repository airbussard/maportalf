-- Migration: Add cancellation_notification type to email_queue
-- Version: 2.111
-- Date: 2024-12-12

-- Drop existing constraint and recreate with new type
ALTER TABLE email_queue DROP CONSTRAINT IF EXISTS email_queue_type_check;

ALTER TABLE email_queue ADD CONSTRAINT email_queue_type_check
  CHECK (type IN (
    'ticket',
    'ticket_assignment',
    'ticket_reply',
    'work_request',
    'booking_confirmation',
    'two_factor_code',
    'welcome',
    'invitation',
    'cancellation_notification'
  ));

-- Add comment for documentation
COMMENT ON CONSTRAINT email_queue_type_check ON email_queue IS 'Allowed email types: ticket, ticket_assignment, ticket_reply, work_request, booking_confirmation, two_factor_code, welcome, invitation, cancellation_notification';
