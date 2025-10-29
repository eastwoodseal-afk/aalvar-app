"use client"

import { useState } from "react"
import { useAuth } from "../lib/AuthContext"
import { supabase } from "../lib/supabase"

export default function ShotModal({ shotData, onClose }: { shotData: any; onClose: () => void }) {
  const { user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)

  const isOwner = user && shotData.user_id === user.id

  const handleDelete = async () => {
    if (!isOwner || isDeleting) return

    const confirmDelete = confirm("¿Estás seguro de que quieres eliminar este shot? Dejará de aparecer en 'Mis Shots'.")
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from("shots")
        .update({ is_active: false })
        .eq("id", shotData.id)

      if (error) throw error

      alert("Shot eliminado exitosamente")
      onClose()
      window.location.reload()
    } catch (error: any) {
      console.error("Error deleting shot:", error)
      alert("Error al eliminar el shot: " + error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold truncate">{shotData.title}</h2>
          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-500 hover:text-red-700 disabled:opacity-50 p-2"
                title="Eliminar shot"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">
              &times;
            </button>
          </div>
        </div>

        <div className="p-4">
          <img
            src={shotData.image_url || "/placeholder.svg"}
            alt={shotData.description}
            className="w-full rounded-lg mb-4 object-contain max-h-[60vh]"
          />
          <p className="text-gray-700">{shotData.description}</p>
        </div>
      </div>
    </div>
  )
}