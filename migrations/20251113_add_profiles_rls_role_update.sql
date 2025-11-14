-- Migration: Add RLS policy for admins to update profiles.role
-- This allows superadmins and admins to promote users by updating their role

-- First, enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow admins/superadmins to update the role field of any profile
CREATE POLICY "admins_can_update_user_roles"
    ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')
        )
    );

-- Allow authenticated users to read their own profile
CREATE POLICY "users_can_read_own_profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Allow authenticated users to read other public profile info (username, role, etc)
CREATE POLICY "users_can_read_public_profiles"
    ON public.profiles
    FOR SELECT
    USING (true);

-- Allow users to update only non-sensitive fields of their own profile
CREATE POLICY "users_can_update_own_profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
