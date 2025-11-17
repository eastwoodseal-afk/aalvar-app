"use client"

import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/AuthContext"

interface UserProfile {
  username?: string
}

export default function ShotModal({ shotData, onClose }: { shotData: any; onClose: () => void }) {
  const { user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)
  const [creator, setCreator] = useState<UserProfile | null>(null)
  const [loadingCreator, setLoadingCreator] = useState(true)

  const isOwner = user && shotData.user_id === user.id
  const isAdmin = user && ((user as any).role === "admin" || (user as any).role === "superadmin")
  const canDelete = isOwner || isAdmin

  useEffect(() => {
    const fetchCreator = async () => {
      // Si no hay user_id en el shot, no intentamos buscar el creador.
      if (!shotData?.user_id) {
        setLoadingCreator(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", shotData.user_id)
          .single()

        if (error) throw error
        setCreator(data)
      } catch (error) {
        console.error("Error fetching creator:", error)
      } finally {
        setLoadingCreator(false)
      }
    }

    fetchCreator()
  }, [shotData?.user_id])

  const handleDelete = async () => {
    if (!canDelete || isDeleting) return

    const confirmDelete = confirm("¿Estás seguro de que quieres eliminar este shot?")
    if (!confirmDelete) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from("shots")
        .delete()
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
        className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 truncate">{shotData.title}</h2>
            {!loadingCreator && creator && (
              <p className="text-sm text-gray-600 mt-1">por {creator.username}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-500 hover:text-red-700 disabled:opacity-50 p-2"
                title="Eliminar shot"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={shotData.image_url || "/placeholder.svg"}
              alt={shotData.description || "shot"}
              className="w-full h-auto object-contain"
              loading="eager"
            />
          </div>

          {shotData.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Descripción</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{shotData.description}</p>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4 text-sm text-gray-600">
            <p>Publicado: {new Date(shotData.created_at).toLocaleString("es-ES")}</p>
            {shotData.is_approved === false && (
              <p className="text-yellow-600 mt-1">⏳ Pendiente de aprobación</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
