"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function AdminShotModal({
  shotData,
  onClose,
  onApprove,
  onReject,
}: {
  shotData: any
  onClose: () => void
  onApprove?: (id: string | number) => void
  onReject?: (id: string | number) => void
}) {
  const [username, setUsername] = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState<string | null>(null)

  useEffect(() => {
    if (!shotData) return

    const nameFromPayload = shotData?.profiles?.[0]?.username
    if (nameFromPayload) {
      setUsername(nameFromPayload)
      return
    }

    // If the nested relation wasn't returned, fetch the profile directly.
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('username').eq('id', shotData.user_id).single()
        if (error) {
          console.warn('AdminShotModal: could not fetch profile username', error)
          setUsername(null)
          return
        }

        setUsername(data?.username ?? null)
      } catch (err) {
        console.error('AdminShotModal: unexpected error fetching profile', err)
        setUsername(null)
      }
    }

    fetchProfile()

    // Fetch category name
    const fetchCategory = async () => {
      if (!shotData?.category_id) return

      try {
        const { data, error } = await supabase
          .from('categories')
          .select('name')
          .eq('id', shotData.category_id)
          .single()

        if (error) {
          console.warn('AdminShotModal: could not fetch category', error)
          return
        }

        setCategoryName(data?.name ?? null)
      } catch (err) {
        console.error('AdminShotModal: unexpected error fetching category', err)
      }
    }

    fetchCategory()
  }, [shotData])

  if (!shotData) return null

  const handleApprove = () => {
    onApprove?.(shotData.id)
    onClose()
  }

  // ...eliminada lógica de rechazo...

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 text-white w-full max-w-4xl mx-4 rounded-lg overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold">{shotData.title}</h3>
              {categoryName && (
                <span className="px-2 py-1 bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-semibold rounded-full">
                  {categoryName}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400">Creador: {username ? `@${username}` : 'Sin Creador'}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={handleApprove} className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded">✅ Aprobar</button>
            <button onClick={onClose} className="text-gray-300 hover:text-white px-2">Cerrar</button>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="w-full rounded overflow-hidden bg-gray-800 flex items-center justify-center">
              <img
                src={shotData.image_url || '/placeholder.svg'}
                alt={shotData.title}
                className="w-full h-auto object-contain"
                loading="eager"
              />
            </div>
          </div>
          <div className="md:col-span-1">
            <p className="text-gray-300 mb-4">{shotData.description}</p>

            <div className="text-sm text-gray-400 space-y-2">
              <div><strong>ID:</strong> {shotData.id}</div>
              <div><strong>Creador:</strong> {username ? `@${username}` : 'Sin Creador'}</div>
              <div><strong>Estado aprobación:</strong> {shotData.is_approved ? 'Aprobado' : 'Pendiente'}</div>
              <div><strong>Activo:</strong> {shotData.is_active ? 'Sí' : 'No'}</div>
              <div><strong>Creado:</strong> {new Date(shotData.created_at).toLocaleString()}</div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
