-- Fix documents table: Make file_url nullable
-- The file_url column is deprecated in favor of storage_path (Supabase Storage)
-- This allows new documents to use storage_path without needing to populate file_url

-- Make file_url nullable to allow new storage-based uploads
ALTER TABLE documents ALTER COLUMN file_url DROP NOT NULL;

-- Add comment explaining the deprecation
COMMENT ON COLUMN documents.file_url IS 'DEPRECATED: Legacy file URL field. New documents use storage_path instead. This field is kept nullable for backward compatibility with old documents.';

COMMENT ON COLUMN documents.storage_path IS 'Path in Supabase Storage bucket (e.g., general/uuid.pdf or personal/user-id/uuid.pdf). This is the primary storage location for all new documents.';
