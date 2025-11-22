// ============================================
// CATEGORY UTILITIES
// Funciones para interactuar con el sistema de categorías
// ============================================

import { supabase } from "./supabase"

export type Category = {
  id: number
  name: string
  slug: string
  description?: string
  icon_url?: string
  parent_id?: number
  created_at: string
}

/**
 * Obtiene todas las categorías desde Supabase
 * @returns Array de categorías ordenadas por nombre
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching categories:", error)
      return []
    }

    return data || []
  } catch (err) {
    console.error("Unexpected error fetching categories:", err)
    return []
  }
}

/**
 * Obtiene una categoría por su slug
 * @param slug - Slug de la categoría (ej: 'diseno-web')
 * @returns Categoría o null si no existe
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("slug", slug)
      .single()

    if (error) {
      console.error("Error fetching category by slug:", error)
      return null
    }

    return data
  } catch (err) {
    console.error("Unexpected error fetching category:", err)
    return null
  }
}

/**
 * Obtiene categorías hijas de una categoría padre (para jerarquías)
 * @param parentId - ID de la categoría padre
 * @returns Array de subcategorías
 */
export async function getSubcategories(parentId: number): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("parent_id", parentId)
      .order("name", { ascending: true })

    if (error) {
      console.error("Error fetching subcategories:", error)
      return []
    }

    return data || []
  } catch (err) {
    console.error("Unexpected error fetching subcategories:", err)
    return []
  }
}

/**
 * Crea una nueva categoría (solo admins)
 * @param category - Datos de la categoría a crear
 * @returns Categoría creada o null si falla
 */
export async function createCategory(
  category: Omit<Category, "id" | "created_at">
): Promise<Category | null> {
  try {
    const { data, error } = await supabase
      .from("categories")
      .insert(category)
      .select()
      .single()

    if (error) {
      console.error("Error creating category:", error)
      return null
    }

    return data
  } catch (err) {
    console.error("Unexpected error creating category:", err)
    return null
  }
}

/**
 * Actualiza una categoría existente (solo admins)
 * @param id - ID de la categoría
 * @param updates - Campos a actualizar
 * @returns true si se actualizó correctamente
 */
export async function updateCategory(
  id: number,
  updates: Partial<Omit<Category, "id" | "created_at">>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("categories")
      .update(updates)
      .eq("id", id)

    if (error) {
      console.error("Error updating category:", error)
      return false
    }

    return true
  } catch (err) {
    console.error("Unexpected error updating category:", err)
    return false
  }
}

/**
 * Elimina una categoría (solo admins)
 * Nota: Los shots con esta categoría quedarán sin categoría (category_id = null)
 * @param id - ID de la categoría a eliminar
 * @returns true si se eliminó correctamente
 */
export async function deleteCategory(id: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting category:", error)
      return false
    }

    return true
  } catch (err) {
    console.error("Unexpected error deleting category:", err)
    return false
  }
}

/**
 * Obtiene el conteo de shots por categoría
 * @param categoryId - ID de la categoría (opcional, si no se pasa devuelve todos)
 * @returns Conteo de shots
 */
export async function getShotCountByCategory(categoryId?: number): Promise<number> {
  try {
    let query = supabase
      .from("shots")
      .select("*", { count: "exact", head: true })
      .eq("is_approved", true)

    if (categoryId !== undefined) {
      query = query.eq("category_id", categoryId)
    }

    const { count, error } = await query

    if (error) {
      console.error("Error counting shots:", error)
      return 0
    }

    return count || 0
  } catch (err) {
    console.error("Unexpected error counting shots:", err)
    return 0
  }
}

/**
 * Genera opciones para un <select> de categorías
 * @returns Array de objetos con value (id) y label (name)
 */
export async function getCategoryOptions(): Promise<Array<{ value: number; label: string }>> {
  const categories = await getCategories()
  return categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }))
}
