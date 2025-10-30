-- migrations/20251030-drop-is_admin.sql
-- Backup and drop `is_admin` column from public.profiles
-- Run in Supabase SQL Editor. Make sure you have a backup before running in production.

BEGIN;

-- Optional: create backup column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin_backup boolean;
UPDATE public.profiles SET is_admin_backup = is_admin;

-- If you want to keep a CSV backup instead, export the table first via Supabase UI.

-- Drop the original column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;

COMMIT;

-- After verifying app works, you can remove backup column later:
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin_backup;