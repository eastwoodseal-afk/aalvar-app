-- ============================================
-- MIGRATION: App Settings (Feature Flags / Configuración Global)
-- Fecha: 2025-11-17
-- Descripción: Crea tabla app_settings para almacenar configuraciones globales simples
-- ============================================

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_boolean BOOLEAN,
  value_text TEXT,
  updated_at TIMESTAMP DEFAULT now()
);

-- Índice para consultas rápidas por key (aunque PK ya sirve, se deja como documentación)
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Insertar configuración inicial: habilitar filtro de categorías (true por defecto)
INSERT INTO app_settings (key, value_boolean) VALUES ('enable_category_filter', true)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE app_settings IS 'Tabla genérica para configuraciones globales (feature flags)';
COMMENT ON COLUMN app_settings.key IS 'Nombre de la configuración (ej: enable_category_filter)';
COMMENT ON COLUMN app_settings.value_boolean IS 'Valor booleano de la configuración';
COMMENT ON COLUMN app_settings.value_text IS 'Valor textual opcional';

-- Para revertir:
-- DROP TABLE IF EXISTS app_settings CASCADE;
-- ============================================