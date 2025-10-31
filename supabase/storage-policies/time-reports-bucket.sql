-- Storage Bucket Policies for 'time-reports' bucket
-- This bucket stores PDF exports of monthly time reports

-- IMPORTANT: Create the bucket first in Supabase Dashboard:
-- 1. Go to Storage → Create new bucket
-- 2. Name: time-reports
-- 3. Public: NO (private)
-- 4. Run this SQL after bucket creation

-- Policy 1: Admins can upload time reports
CREATE POLICY "Admins can upload time reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'time-reports' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy 2: Admins can read time reports
CREATE POLICY "Admins can read time reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'time-reports' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy 3: Admins can update time reports
CREATE POLICY "Admins can update time reports"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'time-reports' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy 4: Admins can delete time reports
CREATE POLICY "Admins can delete time reports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'time-reports' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy 5: Service role bypass (for cron jobs)
CREATE POLICY "Service role bypass time-reports"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'time-reports')
WITH CHECK (bucket_id = 'time-reports');
