-- Migration: Añadir campo de argumento de desaprobación a shots
ALTER TABLE shots ADD COLUMN IF NOT EXISTS disapproval_reason TEXT;

-- Opcional: comentario para documentación
COMMENT ON COLUMN shots.disapproval_reason IS 'Motivo o argumento de desaprobación del shot por parte de un administrador.';
