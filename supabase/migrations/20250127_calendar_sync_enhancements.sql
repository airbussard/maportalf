-- Calendar Sync Enhancements Migration
-- Adds sync status tracking and sync logs table

-- Note: calendar_events table already exists with many fields
-- We only add the new sync-related columns

-- Add new columns to calendar_events if they don't exist
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced',
  ADD COLUMN IF NOT EXISTS sync_error TEXT,
  ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS etag TEXT;

-- Update existing columns that might be missing
-- The schema shows: id (TEXT), but we need UUID for new events
-- Keep existing id as TEXT for backward compatibility
-- Add created_by if not exists (already in schema)

-- Ensure google_event_id has UNIQUE constraint (already in schema)

-- Add check constraint for sync_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'calendar_events_sync_status_check'
  ) THEN
    ALTER TABLE calendar_events
      ADD CONSTRAINT calendar_events_sync_status_check
      CHECK (sync_status IN ('synced', 'pending', 'error'));
  END IF;
END $$;

-- Create calendar_sync_logs table for tracking sync operations
CREATE TABLE IF NOT EXISTS calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'running')),
  events_imported INT DEFAULT 0,
  events_exported INT DEFAULT 0,
  events_updated INT DEFAULT 0,
  error_message TEXT,
  sync_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster queries on sync_logs
CREATE INDEX IF NOT EXISTS calendar_sync_logs_started_at_idx
  ON calendar_sync_logs(started_at DESC);

CREATE INDEX IF NOT EXISTS calendar_sync_logs_status_idx
  ON calendar_sync_logs(status);

-- Add index on calendar_events for sync status
CREATE INDEX IF NOT EXISTS calendar_events_sync_status_idx
  ON calendar_events(sync_status)
  WHERE sync_status != 'synced';

-- Add index on calendar_events for last_modified_at
CREATE INDEX IF NOT EXISTS calendar_events_last_modified_at_idx
  ON calendar_events(last_modified_at DESC);

-- Enable Row Level Security on calendar_sync_logs
ALTER TABLE calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can view sync logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'calendar_sync_logs'
    AND policyname = 'Anyone can view sync logs'
  ) THEN
    CREATE POLICY "Anyone can view sync logs"
      ON calendar_sync_logs
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- RLS Policy: Only admins can insert sync logs (for manual testing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'calendar_sync_logs'
    AND policyname = 'Only admins can create sync logs'
  ) THEN
    CREATE POLICY "Only admins can create sync logs"
      ON calendar_sync_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- Add trigger to update last_modified_at on calendar_events
CREATE OR REPLACE FUNCTION update_calendar_event_modified_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any, then create (idempotent)
DROP TRIGGER IF EXISTS calendar_events_update_modified_at ON calendar_events;
CREATE TRIGGER calendar_events_update_modified_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_event_modified_at();

-- Add comment for documentation
COMMENT ON TABLE calendar_sync_logs IS 'Logs for Google Calendar synchronization operations';
COMMENT ON COLUMN calendar_events.sync_status IS 'Sync status: synced (in sync with Google), pending (needs export), error (sync failed)';
COMMENT ON COLUMN calendar_events.etag IS 'Google Calendar ETag for conflict detection';
COMMENT ON COLUMN calendar_events.last_modified_at IS 'Last modification timestamp for conflict resolution';
