-- Cleanup: Delete all old documents using file_url system
-- Old documents have files stored locally (not in Supabase Storage)
-- New documents use storage_path (Supabase Storage) with file_url = NULL
-- This script removes legacy documents to clean up the database
-- IMPORTANT: This will NOT delete any Supabase Storage files (old docs don't have them)

-- SAFETY: Show count before deletion
DO $$
DECLARE
  old_docs_count INTEGER;
  new_docs_count INTEGER;
BEGIN
  -- Count old documents (with file_url, files stored locally)
  SELECT COUNT(*) INTO old_docs_count
  FROM documents
  WHERE file_url IS NOT NULL;

  -- Count new documents (with storage_path, files in Supabase Storage)
  SELECT COUNT(*) INTO new_docs_count
  FROM documents
  WHERE storage_path IS NOT NULL;

  RAISE NOTICE '=== DOCUMENT CLEANUP ANALYSIS ===';
  RAISE NOTICE 'Old documents (file_url, local files): %', old_docs_count;
  RAISE NOTICE 'New documents (storage_path, Supabase Storage): %', new_docs_count;
  RAISE NOTICE 'NOTE: Deleting old documents will NOT affect Supabase Storage';
  RAISE NOTICE '====================================';
END $$;

-- DELETE old documents (safe - they have no Supabase Storage files)
-- The trigger will only run for documents with storage_path
DELETE FROM documents WHERE file_url IS NOT NULL;

-- Verify cleanup
DO $$
DECLARE
  remaining INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining FROM documents WHERE file_url IS NOT NULL;
  RAISE NOTICE 'Cleanup complete. Remaining old documents: %', remaining;
END $$;
