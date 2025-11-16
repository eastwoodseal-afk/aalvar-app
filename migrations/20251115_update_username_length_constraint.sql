-- Migration: Update username length constraint from 30 to 15 characters
-- Purpose: Reduce maximum username length to keep usernames concise
-- Notes: This will nullify existing usernames longer than 15 characters

-- 1) Nullify usernames that exceed the new length limit (backup before running if needed)
UPDATE public.profiles
SET username = NULL
WHERE username IS NOT NULL
  AND char_length(username) > 15;

-- 2) Drop the old constraint (if exists)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_length_chk;

-- 3) Add the new constraint with updated length (3-15)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_length_chk
  CHECK (username IS NULL OR (char_length(username) BETWEEN 3 AND 15));

-- Rollback: restore to 3-30 characters
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_length_chk;
-- ALTER TABLE public.profiles
--   ADD CONSTRAINT profiles_username_length_chk
--   CHECK (username IS NULL OR (char_length(username) BETWEEN 3 AND 30));
