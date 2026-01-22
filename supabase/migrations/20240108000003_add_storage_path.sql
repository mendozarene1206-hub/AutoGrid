-- Migration: Add storage_path column for new persistence system
-- This enables storing large snapshots in Supabase Storage instead of JSONB

ALTER TABLE spreadsheets ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_spreadsheets_storage_path ON spreadsheets(storage_path);

-- Comment for documentation
COMMENT ON COLUMN spreadsheets.storage_path IS 'Path to compressed snapshot in Supabase Storage (estimations bucket). Format: {spreadsheet_id}/{timestamp}.json.gz';

-- Create the estimations bucket if it doesn't exist
-- Note: This should be run via Supabase dashboard or API, not SQL directly
-- INSERT INTO storage.buckets (id, name, public) VALUES ('estimations', 'estimations', false) ON CONFLICT DO NOTHING;
