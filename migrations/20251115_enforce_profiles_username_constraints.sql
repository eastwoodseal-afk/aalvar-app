-- Migration: Enforce strong validations on public.profiles.username
-- Purpose: Add DB-level constraints to harden username rules and normalize existing data
-- Notes: This migration is designed to be safe by normalizing data before adding constraints.
-- Rollback: Drops constraints; normalization updates are not automatically reverted.

-- 1) Normalize existing usernames: trim and lowercase
UPDATE public.profiles
SET username = lower(btrim(username))
WHERE username IS NOT NULL
  AND username <> lower(btrim(username));

-- 2) Nullify reserved usernames to force users to choose a different one
-- Adjust list if needed to match your routing/reserved paths
UPDATE public.profiles
SET username = NULL
WHERE username IS NOT NULL
  AND lower(username) IN (
    'admin','superadmin','root','support','help','api','auth','login','signup',
    'settings','profile','profiles','user','users','me','dashboard','admin-panel'
  );

-- 3) Nullify usernames that violate length or allowed characters (so constraints won't fail)
-- Allowed pattern: lowercase letters, digits, underscore, dot, hyphen; must start and end with [a-z0-9]; length 3..15
UPDATE public.profiles
SET username = NULL
WHERE username IS NOT NULL
  AND (
    char_length(username) < 3 OR
    char_length(username) > 15 OR
    username !~ '^[a-z0-9](?:[a-z0-9_.-]*[a-z0-9])?$'
  );

-- 4) Add constraints (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_username_lowercase_chk'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_lowercase_chk
      CHECK (username IS NULL OR username = lower(username));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_username_trimmed_chk'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_trimmed_chk
      CHECK (username IS NULL OR username = btrim(username));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_username_length_chk'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_length_chk
      CHECK (username IS NULL OR (char_length(username) BETWEEN 3 AND 15));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_username_chars_chk'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_chars_chk
      CHECK (username IS NULL OR username ~ '^[a-z0-9](?:[a-z0-9_.-]*[a-z0-9])?$');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_username_reserved_chk'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_username_reserved_chk
      CHECK (username IS NULL OR lower(username) NOT IN (
        'admin','superadmin','root','support','help','api','auth','login','signup',
        'settings','profile','profiles','user','users','me','dashboard','admin-panel'
      ));
  END IF;
END $$;

-- Rollback: drop constraints
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_lowercase_chk;
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_trimmed_chk;
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_length_chk;
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_chars_chk;
-- ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_reserved_chk;
