-- Migration: 2025-10-30
-- Add Row Level Security (RLS) policies to protect the `shots` table
-- Purpose: ensure only authorized roles can INSERT/UPDATE/DELETE and that public SELECT returns only approved+active shots

BEGIN;

-- 1) Enable RLS on the table (safe to run if already enabled)
ALTER TABLE IF EXISTS public.shots ENABLE ROW LEVEL SECURITY;

-- 2) SELECT policy: allow public (anon) and authenticated users to SELECT only approved + active shots
--    This lets the public muro show only approved and active shots.
DROP POLICY IF EXISTS shots_select_public ON public.shots;
CREATE POLICY shots_select_public
  ON public.shots
  FOR SELECT
  TO public
  USING (
    is_approved = true
    AND is_active = true
  );

-- 3) INSERT policy: only allow authenticated users whose profile.role is in the allowed creator roles
DROP POLICY IF EXISTS shots_insert_by_creators ON public.shots;
CREATE POLICY shots_insert_by_creators
  ON public.shots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- The inserting row must belong to the authenticated user
    user_id = auth.uid()
    AND
    -- The user's profile role must be member or higher
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('member', 'admin', 'superadmin')
    )
  );

-- 4) UPDATE policy: allow owners to update their own shots, and admins/superadmins to update any
DROP POLICY IF EXISTS shots_update_owner_or_admin ON public.shots;
CREATE POLICY shots_update_owner_or_admin
  ON public.shots
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    -- Prevent changing ownership unless admin/superadmin
    (user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')
    )
  );

-- 5) DELETE policy: only admins/superadmins can delete shots
DROP POLICY IF EXISTS shots_delete_admins ON public.shots;
CREATE POLICY shots_delete_admins
  ON public.shots
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')
    )
  );

COMMIT;

-- Notes:
-- 1) Policies are evaluated against the SQL role of the connection. Supabase client requests from browsers use the "anon" role
--    which maps to the SQL role "anon" and is included in the "public" role for SELECT policy above. Authenticated users map to
--    the "authenticated" role used in INSERT/UPDATE/DELETE policies.
-- 2) The service_role key bypasses RLS entirely. Never use the service_role key in client-side code.
-- 3) Test these policies in a staging environment first. If you need, I can also produce SQL test commands showing expected failures/successes.
-- 4) If your `profiles` table uses a different primary key or role values, adapt the queries accordingly.
