-- Migration: 2025-11-12_add_shots_rls.sql
-- Habilita RLS y crea políticas para la tabla `shots`.
-- Aplique en Supabase SQL Editor o mediante su pipeline de migraciones.

BEGIN;

-- 1) Activar Row Level Security si no está activado
ALTER TABLE IF EXISTS public.shots ENABLE ROW LEVEL SECURITY;

-- 2) Política INSERT: solo miembros o superiores pueden insertar y solo a su propio user_id
DROP POLICY IF EXISTS shots_insert_by_creators ON public.shots;
CREATE POLICY shots_insert_by_creators
  ON public.shots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('member','admin','superadmin')
    )
  );

-- 3) Política UPDATE: solo el propietario o admins pueden actualizar
DROP POLICY IF EXISTS shots_update_owner_or_admin ON public.shots;
CREATE POLICY shots_update_owner_or_admin
  ON public.shots
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin')
    )
  )
  WITH CHECK (
    -- Force owner or admin; and prevent changing owner to someone else unless admin
    (user_id = auth.uid()) OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin')
    )
  );

-- 4) Política DELETE: solo admins pueden eliminar
DROP POLICY IF EXISTS shots_delete_admins ON public.shots;
CREATE POLICY shots_delete_admins
  ON public.shots
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin')
    )
  );

COMMIT;
