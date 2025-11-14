"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../lib/AuthContext"
import { supabase } from "../lib/supabase"

interface UserProfile {
  email?: string
  username?: string
}

export default function ShotModal({ shotData, onClose, showDelete = true }: { shotData: any; onClose: () => void; showDelete?: boolean }) {
  const { user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)
  const [creator, setCreator] = useState<UserProfile | null>(null)
  const [loadingCreator, setLoadingCreator] = useState(true)

  const isOwner = user && shotData.user_id === user.id

  // Cargar información del creador
  useEffect(() => {
    const fetchCreator = async () => {
      try {
        console.log("fetchCreator - shotData.user_id:", shotData.user_id)

        const { data, error } = await supabase
          .from("profiles")
          // 'profiles' table doesn't have an 'email' column in this project; select username only
          .select("username")
          .eq("id", shotData.user_id)
          .single()

        // Log the raw response to help debug RLS/permissions/404
        console.log("fetchCreator result:", { data, error })

        if (error) throw error

        setCreator(data)
      } catch (error) {
        // Mejor logging: Error puede ser una instancia de Error o un objeto de Supabase
        console.error("Error fetching creator - raw:", error)
        try {
          console.error("Error message:", (error as any)?.message)
          console.error("Error stack:", (error as any)?.stack)
        } catch (e) {
          // ignore
        }
      } finally {
        setLoadingCreator(false)
      }
    }

    fetchCreator()
  }, [shotData.user_id])

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 truncate">{shotData.title}</h2>
            {!loadingCreator && creator && (
              <p className="text-sm text-gray-600 mt-1">por {creator.username || creator.email}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isOwner && showDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-500 hover:text-red-700 disabled:opacity-50 p-2 rounded-lg hover:bg-red-50 transition-colors"
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
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Imagen a tamaño original */}
          <div className="mb-6 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={shotData.image_url || "/placeholder.svg"}
              alt={shotData.description}
              className="w-full h-auto object-contain max-h-[70vh]"
            />
          </div>

          {/* Descripción */}
          {shotData.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Descripción</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                {shotData.description}
              </p>
            </div>
          )}

          {/* Metadatos */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Estado de aprobación */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {shotData.is_approved ? (
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100">
                      <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Estado</p>
                  <p className="text-sm text-gray-600">
                    {shotData.is_approved ? "✓ Aprobado" : "⏳ Pendiente de aprobación"}
                  </p>
                </div>
              </div>

              {/* Fecha de creación */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Fecha de creación</p>
                  <p className="text-sm text-gray-600">{formatDate(shotData.created_at)}</p>
                </div>
              </div>

              {/* ID del shot */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-6"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">ID del shot</p>
                  <p className="text-sm font-mono text-gray-600">#{shotData.id}</p>
                </div>
              </div>

              {/* Creador */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Creador</p>
                  {loadingCreator ? (
                    <p className="text-sm text-gray-500">Cargando...</p>
                  ) : creator ? (
                    <p className="text-sm text-gray-600">{creator.username || creator.email}</p>
                  ) : (
                    <p className="text-sm text-gray-500">Desconocido</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}