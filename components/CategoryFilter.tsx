"use client"

import { useState, useEffect } from 'react'
import { getCategories, getShotCountByCategory, type Category } from '../lib/categoryUtils'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * CategoryFilter - Componente para filtrar shots por categoría en el muro principal
 * Muestra badges clicables con contador de shots por categoría
 */
export default function CategoryFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [categories, setCategories] = useState<Category[]>([])
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const selectedCategoryId = searchParams.get('categoria') ? Number(searchParams.get('categoria')) : null

  useEffect(() => {
    const fetchCategoriesWithCounts = async () => {
      try {
        const cats = await getCategories()
        setCategories(cats)

        // Obtener conteo de shots por categoría
        const countsMap: Record<number, number> = {}
        await Promise.all(
          cats.map(async (cat) => {
            const count = await getShotCountByCategory(cat.id)
            countsMap[cat.id] = count
          })
        )
        setCounts(countsMap)
      } catch (err) {
        console.error('Error fetching categories:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCategoriesWithCounts()
  }, [])

  const handleCategoryClick = (categoryId: number | null) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (categoryId === null) {
      // Quitar filtro de categoría
      params.delete('categoria')
    } else {
      // Aplicar filtro de categoría
      params.set('categoria', String(categoryId))
    }

    const queryString = params.toString()
    router.push(queryString ? `/?${queryString}` : '/')
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse bg-gray-800 rounded-full h-8 w-24" />
        ))}
      </div>
    )
  }

  if (categories.length === 0) return null

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Filtrar por Categoría</h3>
      <div className="flex flex-wrap items-center gap-2">
        {/* Botón "Todas" */}
        <button
          onClick={() => handleCategoryClick(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selectedCategoryId === null
              ? 'bg-[#D4AF37] text-black shadow-md'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Todas
        </button>

        {/* Badges de categorías */}
        {categories.map((cat) => {
          const count = counts[cat.id] || 0
          const isSelected = selectedCategoryId === cat.id

          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-[#D4AF37] text-black shadow-md'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>{cat.name}</span>
              <span className={`text-xs ${isSelected ? 'text-black/70' : 'text-gray-500'}`}>
                ({count})
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
