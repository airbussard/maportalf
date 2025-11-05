-- Migration: Add type column to email_queue
-- Version: 2.056
-- Date: 2025-11-05
-- Description: Adds the missing 'type' column to email_queue table for proper email routing

-- 1. Add type column with DEFAULT and CHECK constraint
ALTER TABLE public.email_queue
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'ticket_reply'
CHECK (type IN ('ticket', 'ticket_assignment', 'work_request', 'ticket_reply'));

-- 2. Update existing records based on content/context
-- Try to infer type from existing data
UPDATE public.email_queue
SET type = CASE
  -- If subject contains "zugewiesen" or "assigned", it's a ticket_assignment
  WHEN subject LIKE '%zugewiesen%' OR subject LIKE '%assigned%' THEN 'ticket_assignment'
  -- If subject contains "Neues Ticket" or "New Ticket", it's a ticket creation
  WHEN subject LIKE '%Neues Ticket%' OR subject LIKE '%New Ticket%' THEN 'ticket'
  -- Default to ticket_reply for all others
  ELSE 'ticket_reply'
END
WHERE type = 'ticket_reply'; -- Only update default values

-- 3. Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_email_queue_type_status
ON public.email_queue(type, status);

-- 4. Verify migration
DO $$
DECLARE
  total_emails INTEGER;
  type_counts RECORD;
BEGIN
  SELECT COUNT(*) INTO total_emails FROM public.email_queue;

  RAISE NOTICE 'Migration erfolgreich abgeschlossen!';
  RAISE NOTICE '  - type Spalte zu email_queue hinzugefügt';
  RAISE NOTICE '  - CHECK constraint für 4 Typen erstellt';
  RAISE NOTICE '  - Index für Performance erstellt';
  RAISE NOTICE '  - Gesamt E-Mails in Queue: %', total_emails;

  -- Show distribution
  FOR type_counts IN
    SELECT type, COUNT(*) as count
    FROM public.email_queue
    GROUP BY type
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '    - %: % E-Mails', type_counts.type, type_counts.count;
  END LOOP;
END $$;
