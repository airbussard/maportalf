-- Fix storage delete trigger
-- Problem: storage.delete_object() function doesn't exist in Supabase
-- Solution: Use direct SQL to delete from storage.objects table
-- Also: Only trigger for documents with storage_path (new system), not file_url (old system)

-- Drop the broken trigger function
DROP FUNCTION IF EXISTS delete_document_storage_file() CASCADE;

-- Create corrected trigger function
CREATE OR REPLACE FUNCTION delete_document_storage_file()
RETURNS TRIGGER AS $$
BEGIN
  -- Only delete from storage if the document uses the new storage system
  -- Old documents (with file_url) don't have files in Supabase Storage
  IF OLD.storage_path IS NOT NULL THEN
    -- Delete directly from storage.objects table
    -- This is the correct way to delete storage objects from triggers
    DELETE FROM storage.objects
    WHERE bucket_id = 'documents'
    AND name = OLD.storage_path;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS delete_document_storage_file_trigger ON documents;

CREATE TRIGGER delete_document_storage_file_trigger
  BEFORE DELETE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION delete_document_storage_file();

-- Verify the fix
DO $$
DECLARE
  old_docs INTEGER;
  new_docs INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_docs FROM documents WHERE file_url IS NOT NULL;
  SELECT COUNT(*) INTO new_docs FROM documents WHERE storage_path IS NOT NULL;

  RAISE NOTICE '=== STORAGE TRIGGER FIXED ===';
  RAISE NOTICE 'Old documents (file_url, no storage): %', old_docs;
  RAISE NOTICE 'New documents (storage_path, has storage): %', new_docs;
  RAISE NOTICE 'Trigger will only delete storage for new documents';
  RAISE NOTICE '================================';
END $$;
