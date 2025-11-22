"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import Masonry from "react-masonry-css"
import { supabase } from "../lib/supabase"
import Shot from "./Shot"

type ShotData = {
  id: number
  image_url: string
  title: string
  description: string
  user_id?: string          // Opcional ahora (solo se usa en modo admin/userFilter)
  is_approved?: boolean     // Opcional
  is_active?: boolean       // Opcional
  profiles?: {
    username: string
  }[] | null
  categories?: {
    name: string
  }[] | null
}

/**
 * MasonryWall - Componente que muestra una cuadrícula de shots con diseño masonry
 * 
 * @param props
 * @param props.isLoggedIn - Si true, muestra el botón de guardar en cada shot
 * @param props.savedShotIds - Set de IDs de shots que el usuario ha guardado
 * @param props.userFilter - Si se provee, muestra solo shots del usuario especificado (usado en "Mis Shots")
 * @param props.showOnlySaved - Si true, muestra solo shots guardados por el usuario (usado en "Shots Guardados")
 * @param props.isAdminMode - Si true, muestra shots pendientes y controles de aprobación (usado en Panel Admin)
 * @param props.searchQuery - Texto de búsqueda para filtrar shots por título, descripción, username
 * @param props.categoryFilter - ID de categoría para filtrar shots por categoría específica
 * @param props.onApprove - Callback para aprobar shots (solo usado en Panel Admin)
 * @param props.onReject - Callback para rechazar shots (solo usado en Panel Admin)
 * 
 * Uso según contexto:
 * - Muro Principal: Solo necesita isLoggedIn y savedShotIds (muestra shots is_approved=true, independiente de is_active)
 * - Mis Shots: Añade userFilter
 * - Shots Guardados: Añade showOnlySaved=true
 * - Panel Admin: Usa isAdminMode=true y los callbacks
 */
export default function MasonryWall({
  isLoggedIn,
  savedShotIds,
  userFilter,
  showOnlySaved,
  isAdminMode = false,
  approvedShotIds,
  searchQuery,
  categoryFilter,
  onApprove,
  onReject,
  onOpenShot,
}: {
  isLoggedIn: boolean
  savedShotIds: Set<number>
  userFilter?: string
  showOnlySaved?: boolean
  isAdminMode?: boolean
  approvedShotIds?: Set<string>
  searchQuery?: string
  categoryFilter?: number
  onApprove?: (id: number) => void
  onReject?: (id: number) => void
  onOpenShot?: (shotData: any) => void
}) {
  const [shots, setShots] = useState<ShotData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Infinite scroll (solo muro principal: sin filtros, sin admin, sin guardados)
  const enableInfinite = useMemo(() => !isAdminMode && !userFilter && !showOnlySaved, [isAdminMode, userFilter, showOnlySaved])
  const PAGE_SIZE = 30
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const seenIdsRef = useRef<Set<number>>(new Set())

  // Initial fetch
  useEffect(() => {
    let canceled = false

    const fetchInitial = async () => {
      try {
        setLoading(true)
        setError(null)
        setShots([])
        setPage(0)
        setHasMore(true)
        seenIdsRef.current = new Set()

        if (enableInfinite) {
          // First page for main wall (approved only)
          // Optimizado: solo campos necesarios para el tile
          let query = supabase
            .from("shots")
            .select(`id, title, image_url, description, user_id, profiles!shots_user_id_fkey (username), categories!shots_category_id_fkey (name)`)
            .eq("is_approved", true)

          // Filtrar por categoría si está especificada
          if (categoryFilter) {
            query = query.eq("category_id", categoryFilter)
          }

          const { data, error: fetchError } = await query
            .order("created_at", { ascending: false })
            .range(0, PAGE_SIZE - 1)

          if (fetchError) throw fetchError
          if (canceled) return

          const unique = (data || []).filter((s) => {
            const exists = seenIdsRef.current.has(s.id)
            if (!exists) seenIdsRef.current.add(s.id)
            return !exists
          })
          setShots(unique)
          setHasMore((data || []).length === PAGE_SIZE)
          setPage(1)
        } else {
          // Non-infinite modes: fetch all with existing filters
          // Optimizado: solo campos necesarios (agregamos user_id/is_approved para filtros admin)
          let query = supabase
            .from("shots")
            .select(`id, title, image_url, description, user_id, is_approved, is_active, profiles!shots_user_id_fkey (username), categories!shots_category_id_fkey (name)`)

          if (!isAdminMode) {
            if (userFilter) {
              query = query.eq("user_id", userFilter).eq("is_active", true)
            } else {
              query = query.eq("is_approved", true)
            }
          } else {
            query = query.or("is_approved.eq.false,is_approved.is.null")
          }

          // Filtrar por categoría si está especificada
          if (categoryFilter) {
            query = query.eq("category_id", categoryFilter)
          }

          const { data, error: fetchError } = await query.order("created_at", { ascending: false })
          if (fetchError) throw fetchError
          if (canceled) return
          setShots(data || [])
        }
      } catch (err: any) {
        if (!canceled) {
          console.error("Error fetching shots (initial):", err)
          setError(err.message)
        }
      } finally {
        if (!canceled) setLoading(false)
      }
    }

    fetchInitial()
    return () => {
      canceled = true
    }
  }, [enableInfinite, userFilter, showOnlySaved, isAdminMode, categoryFilter])

  // Load more when sentinel is visible
  useEffect(() => {
    if (!enableInfinite) return
    if (!hasMore || loading || loadingMore) return

    const el = sentinelRef.current
    if (!el) return

    const io = new IntersectionObserver((entries) => {
      const first = entries[0]
      if (first && first.isIntersecting) {
        // Fetch next page
        ;(async () => {
          try {
            setLoadingMore(true)
            const from = page * PAGE_SIZE
            const to = from + PAGE_SIZE - 1
            // Optimizado: solo campos necesarios para tiles
            let query = supabase
              .from("shots")
              .select(`id, title, image_url, description, user_id, profiles!shots_user_id_fkey (username), categories!shots_category_id_fkey (name)`)
              .eq("is_approved", true)

            // Filtrar por categoría si está especificada
            if (categoryFilter) {
              query = query.eq("category_id", categoryFilter)
            }

            const { data, error: fetchError } = await query
              .order("created_at", { ascending: false })
              .range(from, to)

            if (fetchError) throw fetchError

            const unique = (data || []).filter((s) => {
              const exists = seenIdsRef.current.has(s.id)
              if (!exists) seenIdsRef.current.add(s.id)
              return !exists
            })
            setShots((prev) => (unique.length > 0 ? [...prev, ...unique] : prev))
            setHasMore((data || []).length === PAGE_SIZE)
            setPage((p) => p + 1)
          } catch (err) {
            console.error("Error fetching more shots:", err)
            setHasMore(false)
          } finally {
            setLoadingMore(false)
          }
        })()
      }
    }, { rootMargin: "400px 0px" })

    io.observe(el)
    return () => io.disconnect()
  }, [enableInfinite, hasMore, loading, loadingMore, page])

  if (loading) {
    // Skeleton grid with deterministic heights to avoid hydration mismatches
    const skeletonCols = [1, 2, 3, 4, 5, 6]
    const heights = [180, 220, 260, 200, 240, 300]
    return (
      <div className="flex w-auto -ml-4">
        {skeletonCols.map((col) => (
          <div key={col} className="pl-4 bg-clip-padding w-1/6 space-y-4">
            {heights.map((h, i) => (
              <div key={i} className="animate-pulse bg-gray-800 rounded-xl" style={{ height: h }} />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-center mt-8 text-red-500">Error: {error}</p>
  }

  // Filtrar por búsqueda si hay searchQuery
  let shotsToDisplay = showOnlySaved ? shots.filter((shot) => savedShotIds.has(shot.id)) : shots
  
  if (searchQuery && searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim()
    shotsToDisplay = shotsToDisplay.filter((shot) => {
      const titleMatch = shot.title?.toLowerCase().includes(query)
      const descMatch = shot.description?.toLowerCase().includes(query)
      const usernameMatch = shot.profiles?.[0]?.username?.toLowerCase().includes(query)
      return titleMatch || descMatch || usernameMatch
    })
  }

  if (shotsToDisplay.length === 0) {
    return (
      <div className="text-center mt-12">
        <p className="text-gray-400 text-lg">
          {searchQuery && searchQuery.trim()
            ? `No se encontraron resultados para "${searchQuery}"`
            : isAdminMode 
            ? "No hay shots pendientes de aprobación." 
            : userFilter 
            ? "No tienes shots creados aún." 
            : showOnlySaved 
            ? "No has guardado ningún shot aún."
            : "No hay shots aprobados para mostrar."
          }
        </p>
      </div>
    )
  }

  // Callback para desaprobar shot en BD y eliminarlo del muro principal
  const handleDisapprove = async (id: number, reason: string = '') => {
    await supabase
      .from('shots')
      .update({ is_approved: false, disapproval_reason: reason })
      .eq('id', id);
    setShots((prev) => prev.filter((shot) => shot.id !== id));
  };

  return (
    <>
      <Masonry
        breakpointCols={{
          default: 6,
          1280: 6,
          1024: 6,
          768: 4,
          640: 3,
        }}
        className="flex w-auto -ml-4"
        columnClassName="pl-4 bg-clip-padding"
      >
        {shotsToDisplay.map((shot) => {
          // Extraer category_name del join de Supabase
          const categoryName = shot.categories?.[0]?.name || null
          const shotWithCategory = { ...shot, category_name: categoryName }
          
          return (
            <Shot
              key={shot.id}
              isLoggedIn={isLoggedIn}
              shotData={shotWithCategory}
              isInitiallySaved={savedShotIds.has(shot.id)}
              isAdminMode={isAdminMode}
              isApproved={approvedShotIds?.has(String(shot.id))}
              onApprove={onApprove}
              onReject={onReject}
              onOpenShot={onOpenShot}
              onDisapprove={handleDisapprove}
            />
          )
        })}
      </Masonry>
      {/* Sentinel for infinite scroll (only active on main wall)*/}
      {enableInfinite && hasMore && (
        <div ref={sentinelRef} className="w-full py-6 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-transparent" />
        </div>
      )}
    </>
  )
}