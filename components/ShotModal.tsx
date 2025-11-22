"use client"

import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../lib/AuthContext"

interface UserProfile {
  username?: string
}

export default function ShotModal({ shotData, onClose, embedded = false }: { shotData: any; onClose: () => void; embedded?: boolean }) {
  const { user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)
  const [creator, setCreator] = useState<UserProfile | null>(null)
  const [loadingCreator, setLoadingCreator] = useState(true)
  const [categoryName, setCategoryName] = useState<string | null>(null)

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

    const fetchCategory = async () => {
      if (!shotData?.category_id) return

      try {
        const { data, error } = await supabase
          .from("categories")
          .select("name")
          .eq("id", shotData.category_id)
          .single()

        if (error) throw error
        setCategoryName(data?.name || null)
      } catch (error) {
        console.error("Error fetching category:", error)
      }
    }

    fetchCreator()
    fetchCategory()
  }, [shotData?.user_id, shotData?.category_id])

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
    <div className="relative">
      <div className="bg-gray-900 rounded-xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-white truncate">{shotData.title}</h2>
              {categoryName && (
                <span className="px-3 py-1 bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-semibold rounded-full whitespace-nowrap">
                  {categoryName}
                </span>
              )}
            </div>
            {!loadingCreator && (
              <p className="text-sm text-gray-400 mt-1">
                Creador: {creator?.username ? `@${creator.username}` : 'Sin Creador'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-200 p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6 rounded-lg overflow-hidden bg-black"> 
            <img
              src={shotData.image_url || "/placeholder.svg"}
              alt={shotData.description || "shot"}
              className="w-full h-auto object-contain"
              loading="eager"
            />
          </div>

          {shotData.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Descripción</h3>
              <p className="text-gray-300 whitespace-pre-wrap">{shotData.description}</p>
            </div>
          )}

          <div className="border-t border-gray-800 pt-4 text-sm text-gray-400">
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
