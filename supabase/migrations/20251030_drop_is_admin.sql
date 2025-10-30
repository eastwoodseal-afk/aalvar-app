-- supabase/migrations/20251030_drop_is_admin.sql
-- Backup and drop `is_admin` column from public.profiles
-- This file uses the expected migration naming pattern (<timestamp>_name.sql)

BEGIN;

-- Optional: create backup column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin_backup boolean;
UPDATE public.profiles SET is_admin_backup = is_admin;

-- Drop the original column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;

COMMIT;

-- After verifying app works, you can remove backup column later:
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin_backup;
