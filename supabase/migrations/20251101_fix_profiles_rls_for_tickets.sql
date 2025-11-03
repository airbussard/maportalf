-- Fix RLS Policy: Allow users to view sender profiles in tickets
-- Problem: Users cannot see sender information in ticket messages because RLS blocks the profiles JOIN
-- Solution: Add policy that allows viewing profiles of message senders in tickets user has access to

-- Add new policy for viewing sender profiles in tickets
CREATE POLICY "Users can view sender profiles in tickets" ON profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM ticket_messages tm
    JOIN tickets t ON tm.ticket_id = t.id
    WHERE tm.sender_id = profiles.id
    AND (
      -- User created the ticket
      t.created_by = auth.uid()
      OR
      -- Ticket is assigned to user
      t.assigned_to = auth.uid()
      OR
      -- User is admin or manager
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
      )
    )
  )
);

-- Verify the new policy
DO $$
BEGIN
  RAISE NOTICE '=== RLS POLICY ADDED ===';
  RAISE NOTICE 'Policy: Users can view sender profiles in tickets';
  RAISE NOTICE 'Allows viewing profiles of message senders in accessible tickets';
  RAISE NOTICE '========================';
END $$;
