-- Migration: Add unique partial index on profiles.username (case-insensitive)
-- Purpose: Enforce uniqueness of usernames while allowing NULL (users not yet set)
-- Rollback: Drops the index.

-- Create the index (case-insensitive using LOWER) and exclude NULL usernames
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
ON public.profiles (LOWER(username))
WHERE username IS NOT NULL;

-- Optional: (Uncomment to add a simple check constraint disallowing spaces at ends)
-- ALTER TABLE public.profiles
--   ADD CONSTRAINT profiles_username_trimmed_chk
--   CHECK (username IS NULL OR (username = BTRIM(username)));

-- Optional: (Uncomment to restrict length, e.g., 3..40)
-- ALTER TABLE public.profiles
--   ADD CONSTRAINT profiles_username_length_chk
--   CHECK (username IS NULL OR (char_length(username) BETWEEN 3 AND 40));

-- Rollback
-- DROP INDEX IF EXISTS profiles_username_unique_idx;
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_trimmed_chk;
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_length_chk;
