-- Migration: Verify column state and policy updates
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'is_admin'
) as is_admin_exists;

SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'is_admin_backup'
) as is_admin_backup_exists;

-- Check policy definition
SELECT
    n.nspname AS schema,
    c.relname AS table,
    p.polname AS policy_name,
    pg_get_expr(p.polqual, p.polrelid) AS using_expression,
    pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expression
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'shots'
AND p.polname = 'Admins can update any shot';