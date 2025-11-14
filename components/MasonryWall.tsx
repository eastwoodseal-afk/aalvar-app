"use client"

import { useState, useEffect } from "react"
import Masonry from "react-masonry-css"
import { supabase } from "../lib/supabase"
import Shot from "./Shot"

type ShotData = {
  id: number
  image_url: string
  title: string
  description: string
  user_id: string
  profiles?: {
    username: string
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
  onApprove,
  onReject,
  onOpenShot,
}: {
  isLoggedIn: boolean
  savedShotIds: Set<number>
  userFilter?: string
  showOnlySaved?: boolean
  isAdminMode?: boolean
  onApprove?: (id: number) => void
  onReject?: (id: number) => void
  onOpenShot?: (shotData: any) => void
}) {
  const [shots, setShots] = useState<ShotData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchShots = async () => {
      try {
        setLoading(true)
        console.log("Fetching shots with params:", { userFilter, showOnlySaved, isAdminMode })
        
        // Include creator username via the profiles relationship so parent pages (admin modal etc.)
        // can show the correct username instead of falling back to 'desconocido'.
        let query = supabase
          .from("shots")
          .select(`id, title, image_url, description, user_id, is_approved, is_active, profiles!shots_user_id_fkey ( username )`)

        if (!isAdminMode) {
          if (userFilter) {
            // Mis Shots: show only active shots from this user
            query = query.eq("user_id", userFilter).eq("is_active", true)
            console.log("Query for user shots:", userFilter)
          } else {
            // Main wall: show all approved shots (active or inactive)
            query = query.eq("is_approved", true)
            console.log("Query for main wall: approved shots only")
          }
        } else {
          // Admin mode: show pending shots
          query = query.or("is_approved.eq.false,is_approved.is.null")
          console.log("Query for admin mode: pending shots")
        }

        const { data, error: fetchError } = await query.order("created_at", { ascending: false })

        if (fetchError) {
          throw fetchError
        }

        console.log("Fetched shots data:", data)
        setShots(data || [])
      } catch (err: any) {
        setError(err.message)
        console.error("Error fetching shots:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchShots()
  }, [userFilter, showOnlySaved, isAdminMode])

  if (loading) {
    return <p className="text-center mt-8 text-gray-400">Cargando shots...</p>
  }

  if (error) {
    return <p className="text-center mt-8 text-red-500">Error: {error}</p>
  }

  const shotsToDisplay = showOnlySaved ? shots.filter((shot) => savedShotIds.has(shot.id)) : shots

  if (shotsToDisplay.length === 0) {
    return (
      <div className="text-center mt-12">
        <p className="text-gray-400 text-lg">
          {isAdminMode 
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

  return (
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
      {shotsToDisplay.map((shot) => (
        <Shot
          key={shot.id}
          isLoggedIn={isLoggedIn}
          shotData={shot}
          isInitiallySaved={savedShotIds.has(shot.id)}
          isAdminMode={isAdminMode}
          onApprove={onApprove}
          onReject={onReject}
          onOpenShot={onOpenShot}
        />
      ))}
    </Masonry>
  )
}