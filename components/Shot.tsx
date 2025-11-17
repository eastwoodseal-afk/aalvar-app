"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../lib/AuthContext"
import { supabase } from "../lib/supabase"
import ShotModal from "./ShotModal"

export default function Shot({
  isLoggedIn,
  shotData,
  isInitiallySaved,
  isAdminMode = false,
  onApprove,
  onReject,
  onOpenShot,
}: {
  isLoggedIn: boolean
  shotData: any
  isInitiallySaved: boolean
  isAdminMode?: boolean
  onApprove?: (id: number) => void
  onReject?: (id: number) => void
  onOpenShot?: (shotData: any) => void
}) {
  const { user } = useAuth()
  const [isSaved, setIsSaved] = useState(isInitiallySaved)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  useEffect(() => {
    setIsSaved(isInitiallySaved)
  }, [isInitiallySaved])

  const handleSaveClick = async (e: any) => {
    e.stopPropagation()
    if (!user) return
    
    // Si ya está guardado, no hacer nada (evitar que se elimine accidentalmente)
    if (isSaved) return

    // Guardar directamente en saved_shots (sin modal, sin tablero)
    try {
      const { error } = await supabase.from("saved_shots").insert({ user_id: user.id, shot_id: shotData.id })
      
      if (error && error.code !== "23505") {
        console.error("Error saving shot:", error)
        return
      }
      
      // Cambiar estado a guardado (sin alert, solo cambio visual)
      setIsSaved(true)
    } catch (error) {
      console.error("Error saving shot:", error)
    }
  }

  const handleImageClick = () => {
    if (onOpenShot) {
      onOpenShot(shotData)
      return
    }
    setIsDetailModalOpen(true)
  }

  return (
    <>
      <div className="break-inside-avoid mb-4 group cursor-pointer">
        <div className="relative overflow-hidden rounded-xl">
          <img
              src={shotData.image_url || "/placeholder.svg"}
              alt={shotData.description}
              className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              decoding="async"
              onClick={handleImageClick}
            />

          {isLoggedIn && !isAdminMode && (
            <button
              onClick={handleSaveClick}
              disabled={isSaved}
              className={`absolute top-2 right-2 p-2 rounded-full transition-all duration-300 ${
                isSaved
                  ? "bg-[#D4AF37] text-black cursor-default"
                  : "bg-[rgb(224,0,122)]/25 text-white ring-1 ring-transparent hover:bg-[rgb(224,0,122)] hover:ring-2 hover:ring-[#D4AF37] hover:brightness-110 hover:scale-110 cursor-pointer"
              }`}
              title={isSaved ? "Ya guardado" : "Guardar"}
            >
              {isSaved ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          )}

          {isAdminMode && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={() => onApprove?.(shotData.id)}
                className="p-2 rounded-full bg-green-600 text-white hover:bg-green-700"
                title="Aprobar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="mt-2 text-sm leading-tight">
          <p className="font-semibold">{shotData.title}</p>
          <p className="text-gray-600 truncate">{shotData.description}</p>
        </div>
      </div>

  {isDetailModalOpen && <ShotModal shotData={shotData} onClose={() => setIsDetailModalOpen(false)} />}
    </>
  )
}