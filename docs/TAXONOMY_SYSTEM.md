# 🏗️ Sistema de Taxonomía Escalable - Aalvar App

## Arquitectura Propuesta

### **Niveles de Organización**

#### 1️⃣ **Tableros (Boards)** — IMPLEMENTADO ✅
- **Tipo**: Colecciones privadas
- **Alcance**: Usuario individual
- **Propósito**: Organizar shots guardados personalmente
- **Relación**: Many-to-many con shots
- **Visibilidad**: Solo el propietario

```sql
boards
├─ id (PK)
├─ user_id (FK) → profiles.id
├─ name (VARCHAR)
├─ created_at (TIMESTAMP)
└─ is_public (BOOLEAN, DEFAULT false) -- Para futuro

board_shots
├─ board_id (FK) → boards.id ON DELETE CASCADE
├─ shot_id (FK) → shots.id ON DELETE CASCADE
└─ created_at (TIMESTAMP)
```

---

#### 2️⃣ **Categorías (Categories)** — PROPUESTO 🔮
- **Tipo**: Clasificación pública jerárquica
- **Alcance**: Global (toda la app)
- **Propósito**: Filtrar/explorar shots por tipo de contenido
- **Relación**: One-to-many (un shot = una categoría principal)
- **Visibilidad**: Todos los usuarios
- **Ejemplos**: 
  - Diseño Web
  - Ilustración
  - Fotografía
  - 3D/Animación
  - UI/UX
  - Branding

```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon_url TEXT,
  parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL, -- Subcategorías
  created_at TIMESTAMP DEFAULT now()
);

-- Añadir a tabla shots:
ALTER TABLE shots ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
```

**Rutas nuevas:**
- `/explorar/categoria/diseno-web`
- `/explorar/categoria/ilustracion`

---

#### 3️⃣ **Etiquetas (Tags)** — PROPUESTO 🔮
- **Tipo**: Clasificación múltiple horizontal
- **Alcance**: Global
- **Propósito**: Búsqueda transversal, filtros combinados
- **Relación**: Many-to-many (un shot = múltiples tags)
- **Visibilidad**: Todos los usuarios
- **Ejemplos**: 
  - #minimalista #responsive #dark-mode
  - #retro #vintage #tipografía
  - #paisaje #atardecer #naturaleza

```sql
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE shot_tags (
  shot_id INTEGER NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (shot_id, tag_id)
);
```

**Rutas nuevas:**
- `/explorar/tag/minimalista`
- `/explorar?tags=retro,vintage`

---

#### 4️⃣ **Colecciones Curadas (Curated Collections)** — PROPUESTO 🔮
- **Tipo**: Selecciones editoriales temáticas
- **Alcance**: Administradores/Editores
- **Propósito**: Destacar contenido de calidad, crear narrativas
- **Relación**: Many-to-many con shots
- **Visibilidad**: Todos (solo admins editan)
- **Ejemplos**:
  - "Lo Mejor del Mes"
  - "Inspiración para Navidad"
  - "Diseños Mexicanos"
  - "Nuevos Talentos"

```sql
CREATE TABLE curated_collections (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  cover_image_url TEXT,
  curator_id VARCHAR REFERENCES profiles(id), -- Admin que curó
  is_featured BOOLEAN DEFAULT false, -- Destacada en homepage
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE collection_shots (
  collection_id INTEGER NOT NULL REFERENCES curated_collections(id) ON DELETE CASCADE,
  shot_id INTEGER NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0, -- Orden manual
  added_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (collection_id, shot_id)
);
```

**Rutas nuevas:**
- `/colecciones/lo-mejor-del-mes`
- `/colecciones/featured`

---

#### 5️⃣ **Comunidades/Grupos (Communities)** — FUTURO 🌟
- **Tipo**: Espacios colaborativos temáticos
- **Alcance**: Miembros suscritos
- **Propósito**: Crear nichos, compartir trabajo específico
- **Relación**: Many-to-many (usuarios + shots)
- **Visibilidad**: Públicas o privadas
- **Ejemplos**:
  - "Diseñadores Mexicanos"
  - "Fotografía Análoga"
  - "Desarrollo Web"

```sql
CREATE TABLE communities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  creator_id VARCHAR REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE community_members (
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member', -- member, moderator, admin
  joined_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);

CREATE TABLE community_shots (
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  shot_id INTEGER NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
  posted_by VARCHAR REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (community_id, shot_id)
);
```

---

## 🎯 Comparativa de Sistemas

| Sistema | Tipo | Alcance | Creador | Relación | Jerarquía |
|---------|------|---------|---------|----------|-----------|
| **Tableros** | Colecciones | Usuario | Usuario | Many-to-many | No |
| **Categorías** | Clasificación | Global | Admin | One-to-many | Sí (padres/hijos) |
| **Etiquetas** | Keywords | Global | Usuario/Auto | Many-to-many | No |
| **Colecciones Curadas** | Editorial | Global | Admin | Many-to-many | No |
| **Comunidades** | Sociales | Grupo | Usuario | Many-to-many | No |

---

## 📈 Roadmap de Implementación

### **Fase 1: Estabilización Actual** ✅
- [x] Tableros privados funcionando
- [x] Drag & drop entre tableros
- [x] Conteo de shots por tablero

### **Fase 2: Categorías Públicas** 🔜
1. Crear tabla `categories` con jerarquía
2. Añadir `category_id` a shots (al crear/editar)
3. Crear filtros en wall principal: `/explorar?categoria=diseno-web`
4. Panel admin: gestión de categorías
5. Selector de categoría en formulario "Crear Shot"

### **Fase 3: Sistema de Etiquetas** 🔜
1. Crear tablas `tags` y `shot_tags`
2. Input de tags en formulario de creación (autocomplete)
3. Filtros combinados: `/explorar?tags=minimalista,responsive`
4. Cloud de tags en sidebar
5. Sugerencias de tags relacionados

### **Fase 4: Colecciones Curadas** 🔮
1. Crear tablas `curated_collections` y `collection_shots`
2. Panel admin: crear/editar colecciones
3. Página dedicada: `/colecciones/[slug]`
4. Sección homepage: "Colecciones Destacadas"
5. Orden manual con drag & drop en admin

### **Fase 5: Comunidades** 🌟
1. Crear sistema de grupos (tablas communities)
2. Solicitudes de membresía/invitaciones
3. Feed exclusivo por comunidad
4. Moderación comunitaria
5. Badges de pertenencia

---

## 🔧 Consideraciones Técnicas

### **Performance**
- Índices en columnas de búsqueda (`slug`, `category_id`, `tag_id`)
- Cache de conteos (Redis) para tags populares
- Paginación en listados de categorías/tags

### **UX**
- **Categorías**: Dropdown jerárquico en formularios
- **Tags**: Input con autocomplete y chips
- **Colecciones**: Cards visuales con cover image
- **Comunidades**: Sistema de solicitudes + notificaciones

### **Permisos**
- Categorías: Solo admins
- Tags: Cualquier usuario al crear shot
- Colecciones: Solo admins/superadmins
- Comunidades: Creadores (member+) / Moderación (admins)

---

## 📊 Queries Ejemplo

### Shots por categoría
```sql
SELECT shots.*, categories.name as category_name
FROM shots
JOIN categories ON shots.category_id = categories.id
WHERE categories.slug = 'diseno-web'
  AND shots.is_approved = true
ORDER BY shots.created_at DESC;
```

### Shots con múltiples tags
```sql
SELECT DISTINCT shots.*
FROM shots
JOIN shot_tags ON shots.id = shot_tags.shot_id
JOIN tags ON shot_tags.tag_id = tags.id
WHERE tags.slug IN ('minimalista', 'responsive', 'dark-mode')
  AND shots.is_approved = true
GROUP BY shots.id
HAVING COUNT(DISTINCT tags.id) = 3; -- Los 3 tags
```

### Colección curada
```sql
SELECT shots.*, collection_shots.position
FROM shots
JOIN collection_shots ON shots.id = collection_shots.shot_id
WHERE collection_shots.collection_id = 1
ORDER BY collection_shots.position ASC;
```

---

## 🎨 Propuesta Visual

### Navegación Escalable
```
Header
├─ Explorar ▼
│  ├─ Todas las Categorías
│  ├─ Diseño Web
│  ├─ Ilustración
│  ├─ Fotografía
│  └─ ...
├─ Colecciones ▼
│  ├─ Destacadas
│  ├─ Lo Mejor del Mes
│  └─ Ver Todas
├─ Comunidades ▼
│  ├─ Mis Comunidades
│  ├─ Explorar Comunidades
│  └─ Crear Comunidad
└─ Shots Guardados (personal)
   ├─ Todos
   ├─ [Tablero 1]
   └─ [Tablero 2]
```

---

## ✅ Ventajas del Sistema Modular

1. **Flexibilidad**: Cada nivel tiene propósito diferente
2. **Escalabilidad**: Añadir nuevos niveles sin romper existentes
3. **SEO**: URLs amigables (`/categoria/diseno-web`, `/tag/minimalista`)
4. **Engagement**: Múltiples formas de descubrir contenido
5. **Monetización**: Comunidades premium, colecciones exclusivas
6. **Analytics**: Trackear qué categorías/tags son populares

---

## 🚨 Diferencias Clave

| Concepto | Privado/Público | Creador | Cardinalidad | Propósito |
|----------|----------------|---------|--------------|-----------|
| **Tablero** | Privado | Usuario | N:N | Organización personal |
| **Categoría** | Público | Admin | 1:N | Clasificación principal |
| **Tag** | Público | Usuario | N:N | Búsqueda transversal |
| **Colección** | Público | Admin | N:N | Narrativa editorial |
| **Comunidad** | Ambos | Usuario | N:N | Colaboración grupal |

---

## 🎯 Próximos Pasos

1. **Decidir prioridad**: ¿Empezamos con Categorías o Tags?
2. **Diseñar tablas**: Crear migrations en Supabase
3. **Actualizar formularios**: Añadir selectores en crear-shot
4. **Implementar filtros**: Queries dinámicas en MasonryWall
5. **Panel admin**: Gestión de categorías/tags

---

**¿Te gustaría empezar con las Categorías o con las Etiquetas?** 🚀
