-- ============================================
-- MIGRATION: Sistema de Categorías
-- Fecha: 2025-11-17
-- Descripción: Crea tabla categories y añade category_id a shots
-- ============================================

-- 1. Crear tabla de categorías
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL, -- Para jerarquía (subcategorías)
  created_at TIMESTAMP DEFAULT now()
);

-- 2. Añadir índices para performance
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- 3. Añadir columna category_id a shots
ALTER TABLE shots 
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;

-- 4. Crear índice en category_id para filtros rápidos
CREATE INDEX idx_shots_category_id ON shots(category_id);

-- 5. Insertar categorías base
INSERT INTO categories (name, slug, description) VALUES
  ('Diseño Web', 'diseno-web', 'Sitios web, landing pages, interfaces web responsivas'),
  ('Ilustración', 'ilustracion', 'Arte digital, ilustraciones, concept art'),
  ('Fotografía', 'fotografia', 'Fotografía artística, retrato, paisaje, producto'),
  ('UI/UX', 'ui-ux', 'Diseño de interfaces, experiencia de usuario, wireframes'),
  ('3D y Animación', '3d-animacion', 'Modelado 3D, renders, animaciones, motion graphics'),
  ('Branding', 'branding', 'Identidad corporativa, logos, diseño de marca'),
  ('Tipografía', 'tipografia', 'Diseño tipográfico, lettering, caligrafía'),
  ('Publicidad', 'publicidad', 'Campañas publicitarias, posters, anuncios'),
  ('Arte Digital', 'arte-digital', 'Arte generativo, pixel art, arte conceptual'),
  ('Arquitectura', 'arquitectura', 'Diseño arquitectónico, renders de edificios')
ON CONFLICT (slug) DO NOTHING;

-- 6. Comentarios para documentación
COMMENT ON TABLE categories IS 'Categorías principales para clasificar shots públicamente';
COMMENT ON COLUMN categories.parent_id IS 'ID de categoría padre para crear jerarquías (ej: Web > Landing Pages)';
COMMENT ON COLUMN shots.category_id IS 'Categoría principal del shot (clasificación pública)';

-- ============================================
-- Nota: Para revertir esta migración:
-- ALTER TABLE shots DROP COLUMN IF EXISTS category_id;
-- DROP TABLE IF EXISTS categories CASCADE;
-- ============================================
