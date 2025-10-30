-- Migration: Update RLS policies to use role='admin' instead of is_admin, then drop is_admin
-- Step 1: List and save existing policies that use is_admin (for reference/backup)
DO $$
BEGIN
    -- We already have backup of is_admin values in is_admin_backup
    RAISE NOTICE 'Backup of is_admin column values already exists in is_admin_backup';
END $$;

-- Step 2: Drop and recreate policies that depend on is_admin
DROP POLICY IF EXISTS "Admins can update any shot" ON public.shots;
CREATE POLICY "Admins can update any shot"
    ON public.shots
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Step 3: Drop the is_admin column (should work now that policies are updated)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;

-- Step 4: Verify changes
DO $$
DECLARE
    column_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'is_admin'
    ) INTO column_exists;

    IF column_exists THEN
        RAISE EXCEPTION 'Migration failed: is_admin column still exists';
    ELSE
        RAISE NOTICE 'Migration successful: is_admin column dropped';
    END IF;
END $$;