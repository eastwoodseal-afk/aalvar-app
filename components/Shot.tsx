"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "../lib/AuthContext"
import { supabase } from "../lib/supabase"
import ShotModal from "./ShotModal"
import SaveToBoardModal from "./SaveToBoardModal"

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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)

  useEffect(() => {
    setIsSaved(isInitiallySaved)
  }, [isInitiallySaved])

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return

    if (isSaved) {
      const confirmUnsave = confirm("¿Quieres quitar este shot de tus guardados?")
      if (!confirmUnsave) return

      try {
        await supabase.from("saved_shots").delete().eq("user_id", user.id).eq("shot_id", shotData.id)

        const { data: boardShots } = await supabase
          .from("board_shots")
          .select("id, board_id")
          .eq("shot_id", shotData.id)

        if (boardShots) {
          for (const bs of boardShots) {
            const { data: board } = await supabase.from("boards").select("user_id").eq("id", bs.board_id).single()

            if (board && board.user_id === user.id) {
              await supabase.from("board_shots").delete().eq("id", bs.id)
            }
          }
        }

        setIsSaved(false)
        // window.location.reload() removed to rely on local state
      } catch (error) {
        console.error("Error unsaving shot:", error)
        alert("Error al quitar el shot de guardados")
      }
    } else {
      setIsSaveModalOpen(true)
    }
  }

  const handleImageClick = () => {
    if (onOpenShot) {
      onOpenShot(shotData)
      return
    }

    setIsModalOpen(true)
  }
  const handleCloseModal = () => setIsModalOpen(false)
  const handleCloseSaveModal = () => setIsSaveModalOpen(false)
  const handleSaved = () => {
    setIsSaved(true)
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
              className={`absolute top-2 right-2 p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                isSaved ? "bg-gray-600 text-white" : "bg-red-600 text-white"
              }`}
            >
              {isSaved ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
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

  {isModalOpen && <ShotModal shotData={shotData} onClose={handleCloseModal} showDelete={isAdminMode} />}
  {isSaveModalOpen && <SaveToBoardModal shotId={shotData.id} onClose={handleCloseSaveModal} onSaved={handleSaved} />}
    </>
  )
}