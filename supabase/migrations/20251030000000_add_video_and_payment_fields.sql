-- Migration: Add video recording and on-site payment fields to calendar_events
-- Date: 2025-10-30

-- Add has_video_recording field
ALTER TABLE public.calendar_events
ADD COLUMN IF NOT EXISTS has_video_recording BOOLEAN DEFAULT false;

-- Add on_site_payment_amount field
ALTER TABLE public.calendar_events
ADD COLUMN IF NOT EXISTS on_site_payment_amount NUMERIC(10,2);

-- Add check constraint to ensure payment amount is non-negative
ALTER TABLE public.calendar_events
ADD CONSTRAINT check_payment_amount_non_negative
CHECK (on_site_payment_amount IS NULL OR on_site_payment_amount >= 0);

-- Add comment for documentation
COMMENT ON COLUMN public.calendar_events.has_video_recording IS 'Indicates if video recording was booked for this event';
COMMENT ON COLUMN public.calendar_events.on_site_payment_amount IS 'Amount to be paid on-site in EUR';
