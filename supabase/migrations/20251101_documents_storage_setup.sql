-- =====================================================
-- Documents Storage Setup for Supabase
-- =====================================================
-- This migration creates a Supabase Storage bucket for document management
-- with proper RLS policies and automatic cleanup triggers

-- =====================================================
-- PART 1: Create Storage Bucket
-- =====================================================

-- Create the 'documents' storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,  -- Private bucket, requires authentication
  10485760,  -- 10MB file size limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/jpg'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PART 2: Storage RLS Policies
-- =====================================================

-- Policy 1: UPLOAD - Only admins can upload documents
CREATE POLICY "Admins can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy 2: SELECT - Users can view documents based on assigned_to
CREATE POLICY "Users can view accessible documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND (
    -- Admins can see all documents
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Users can see general documents (in /general/ folder)
    name LIKE 'general/%'
    OR
    -- Users can see their assigned personal documents (in /personal/{their_id}/ folder)
    name LIKE 'personal/' || auth.uid()::text || '/%'
  )
);

-- Policy 3: UPDATE - Only admins can update document metadata
CREATE POLICY "Admins can update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy 4: DELETE - Only admins can delete documents
CREATE POLICY "Admins can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- =====================================================
-- PART 3: Update documents table to include storage_path
-- =====================================================

-- Add storage_path column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents'
    AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE documents ADD COLUMN storage_path TEXT;
    COMMENT ON COLUMN documents.storage_path IS 'Path in Supabase Storage bucket (e.g., general/uuid.pdf)';
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_documents_storage_path ON documents(storage_path);

-- =====================================================
-- PART 4: Trigger for automatic Storage cleanup on DELETE
-- =====================================================

-- Function to delete file from storage when document record is deleted
CREATE OR REPLACE FUNCTION delete_document_storage_file()
RETURNS TRIGGER AS $$
BEGIN
  -- Only attempt deletion if storage_path exists
  IF OLD.storage_path IS NOT NULL THEN
    -- Delete from storage bucket
    -- Note: This uses Supabase's storage.delete_object() function
    PERFORM storage.delete_object('documents', OLD.storage_path);
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_delete_document_storage ON documents;

-- Create trigger
CREATE TRIGGER trigger_delete_document_storage
BEFORE DELETE ON documents
FOR EACH ROW
EXECUTE FUNCTION delete_document_storage_file();

-- =====================================================
-- PART 5: Helper function to generate storage paths
-- =====================================================

-- Function to generate consistent storage paths
CREATE OR REPLACE FUNCTION generate_storage_path(
  p_assigned_to UUID,
  p_filename TEXT
)
RETURNS TEXT AS $$
BEGIN
  IF p_assigned_to IS NULL THEN
    -- General document: store in /general/ folder
    RETURN 'general/' || p_filename;
  ELSE
    -- Personal document: store in /personal/{employee_id}/ folder
    RETURN 'personal/' || p_assigned_to::TEXT || '/' || p_filename;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION generate_storage_path IS 'Generates consistent storage paths for documents based on assignment';

-- =====================================================
-- PART 6: Update existing documents (migration of legacy data)
-- =====================================================

-- Update existing documents that might have file_url but no storage_path
-- This is a one-time migration for any legacy data
UPDATE documents
SET storage_path = generate_storage_path(assigned_to, filename)
WHERE storage_path IS NULL
  AND filename IS NOT NULL;

-- =====================================================
-- PART 7: Documentation and metadata
-- =====================================================

COMMENT ON COLUMN documents.filename IS 'Hashed/unique filename stored in storage (e.g., abc123.pdf)';
COMMENT ON COLUMN documents.original_filename IS 'Original filename from user upload (preserved for downloads)';
COMMENT ON COLUMN documents.storage_path IS 'Full path in storage bucket: general/{uuid}.pdf or personal/{employee_id}/{uuid}.pdf';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Documents storage setup completed successfully';
  RAISE NOTICE 'Storage bucket: documents';
  RAISE NOTICE 'Bucket policies: 4 (INSERT, SELECT, UPDATE, DELETE)';
  RAISE NOTICE 'Trigger: Automatic storage cleanup on document deletion';
  RAISE NOTICE 'Helper function: generate_storage_path()';
END $$;
