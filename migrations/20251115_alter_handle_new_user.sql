-- Migration: Adjust handle_new_user to stop auto-assigning fallback usernames
-- Purpose: Prevent automatic creation of usernames like 'user_<uuid8>' so that the frontend can prompt the user.
-- Rollback: The original function body is preserved below.

-- =============================
-- NEW FUNCTION (no fallback username)
-- =============================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile without auto-fallback username.
  -- Priority order:
  -- 1) raw_user_meta_data.username if present and non-empty
  -- 2) raw_user_meta_data.pending_username if present and non-empty
  -- 3) NULL (frontend will later set a proper username)
  INSERT INTO public.profiles (id, username, role, created_at)
  VALUES (
    NEW.id,
    CASE
      WHEN NULLIF(NEW.raw_user_meta_data->>'username','') IS NOT NULL THEN NEW.raw_user_meta_data->>'username'
      WHEN NULLIF(NEW.raw_user_meta_data->>'pending_username','') IS NOT NULL THEN NEW.raw_user_meta_data->>'pending_username'
      ELSE NULL
    END,
    CASE 
      WHEN NEW.email = 'eastwood.seal@gmail.com' THEN 'superadmin'
      ELSE 'subscriber'
    END,
    NOW()
  );
  RETURN NEW;
END;
$$;

-- =============================
-- ROLLBACK SCRIPT (restore original behavior)
-- To rollback, run the following:
-- =============================
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS trigger
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- AS $$
-- BEGIN
--   INSERT INTO public.profiles (id, username, role, created_at)
--   VALUES (
--     NEW.id,
--     COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
--     CASE 
--       WHEN NEW.email = 'eastwood.seal@gmail.com' THEN 'superadmin'
--       ELSE 'subscriber'
--     END,
--     NOW()
--   );
--   RETURN NEW;
-- END;
-- $$;

-- After applying this migration, new users without username metadata will have NULL username.
-- Your frontend logic should detect NULL and prompt the user to choose a username.
