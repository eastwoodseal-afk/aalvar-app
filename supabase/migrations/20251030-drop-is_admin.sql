-- supabase/migrations/20251030-drop-is_admin.sql
-- (note: original name uses hyphen; creating underscore-named copy next)
-- Backup and drop `is_admin` column from public.profiles
-- This copy is placed under the supabase migrations folder so the Supabase CLI can detect and apply it via `supabase db push`.

BEGIN;

-- Optional: create backup column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin_backup boolean;
UPDATE public.profiles SET is_admin_backup = is_admin;

-- Drop the original column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;

COMMIT;

-- After verifying app works, you can remove backup column later:
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin_backup;
