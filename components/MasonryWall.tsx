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
}

export default function MasonryWall({
  isLoggedIn,
  savedShotIds,
  userFilter,
  showOnlySaved,
  isAdminMode = false,
  onApprove,
  onReject,
}: {
  isLoggedIn: boolean
  savedShotIds: Set<number>
  userFilter?: string
  showOnlySaved?: boolean
  isAdminMode?: boolean
  onApprove?: (id: number) => void
  onReject?: (id: number) => void
}) {
  const [shots, setShots] = useState<ShotData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchShots = async () => {
      try {
        setLoading(true)
        console.log("Fetching shots with params:", { userFilter, showOnlySaved, isAdminMode })
        
        let query = supabase.from("shots").select("id, title, image_url, description, user_id, is_approved, is_active")

        if (!isAdminMode) {
          if (userFilter) {
            // Mis Shots: show only active shots from this user
            query = query.eq("user_id", userFilter).eq("is_active", true)
            console.log("Query for user shots:", userFilter)
          } else {
            // Main wall: show all approved AND active shots
            query = query.eq("is_approved", true).eq("is_active", true)
            console.log("Query for main wall: approved and active shots")
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
        />
      ))}
    </Masonry>
  )
}