-- Migration: Phase 1 performance indexes and extensions
-- Notes: CREATE INDEX CONCURRENTLY cannot run inside a transaction block. Ensure your migration runner supports non-transactional statements.

-- 0) Enable pg_trgm for ILIKE acceleration (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1) Main wall (approved shots ordered by recency)
-- Matches: SELECT ... FROM shots WHERE is_approved = true ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shots_approved_created_at
  ON public.shots (created_at DESC)
  WHERE is_approved = true;

-- 2) User wall (active shots by user ordered by recency)
-- Matches: SELECT ... FROM shots WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shots_user_active_created_at
  ON public.shots (user_id, created_at DESC)
  WHERE is_active = true;

-- 3) Saved shots
-- Uniqueness of (user_id, shot_id) and quick scans by user
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_shots_user_shot_unique
  ON public.saved_shots (user_id, shot_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saved_shots_user_created_at
  ON public.saved_shots (user_id, created_at DESC);

-- 4) Username search acceleration for ILIKE on profiles.username
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_username_trgm
  ON public.profiles USING GIN (lower(username) gin_trgm_ops)
  WHERE username IS NOT NULL;

-- Rollback (optional):
-- DROP INDEX CONCURRENTLY IF EXISTS idx_profiles_username_trgm;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_saved_shots_user_created_at;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_saved_shots_user_shot_unique;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_shots_user_active_created_at;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_shots_approved_created_at;
-- DROP EXTENSION IF EXISTS pg_trgm;