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
  isApproved = false,
  onApprove,
  onReject,
  onOpenShot,
  onDisapprove,
}: {
  isLoggedIn: boolean
  shotData: any
  isInitiallySaved: boolean
  isAdminMode?: boolean
  isApproved?: boolean
  onApprove?: (id: number) => void
  onReject?: (id: number) => void
  onOpenShot?: (shotData: any) => void
  onDisapprove?: (id: number, reason?: string) => void
}) {
  const { user } = useAuth()
  const [isSaved, setIsSaved] = useState(isInitiallySaved)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [showDisapprove, setShowDisapprove] = useState(false)
  const [disapproveReason, setDisapproveReason] = useState('')
  const [disapproveLoading, setDisapproveLoading] = useState(false)
  const [disapproveError, setDisapproveError] = useState('')
  const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin')

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

          {/* Botón desaprobar para admins en el muro principal */}
          {isAdmin && !isAdminMode && (
            <button
              className="absolute top-2 left-2 p-2 rounded-full bg-red-600/30 text-yellow-700 opacity-60 hover:opacity-100 hover:bg-red-700/70 transition-all duration-300 z-10 flex items-center"
              style={{ backdropFilter: 'blur(2px)' }}
              title="Desaprobar"
              onClick={e => { e.stopPropagation(); setShowDisapprove(v => !v); }}
            >
              {/* Icono triángulo de caution */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 22 20 2 20 12 2" fill="#FFD600" />
                <line x1="12" y1="8" x2="12" y2="13" stroke="#B08A2E" />
                <circle cx="12" cy="16" r="1" fill="#B08A2E" />
              </svg>
            </button>
          )}

          {/* Popover desaprobación centrado sobre el shot */}
          {isAdmin && showDisapprove && !isAdminMode && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowDisapprove(false); setDisapproveReason(''); setDisapproveError(''); }} />
              <div className="relative z-10 w-full max-w-md bg-gray-900 border border-red-700 rounded-xl shadow-2xl p-6 flex flex-col gap-3">
                <h3 className="text-lg text-red-300 font-bold mb-2">Desaprobar Shot</h3>
                <label className="text-sm text-red-300 mb-1 font-semibold">Argumenta la desaprobación:</label>
                <textarea
                  value={disapproveReason}
                  onChange={e => setDisapproveReason(e.target.value)}
                  placeholder="Escribe el motivo..."
                  className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 mb-2"
                  rows={3}
                  disabled={disapproveLoading}
                />
                {disapproveError && <div className="text-red-400 text-sm">{disapproveError}</div>}
                <div className="flex gap-2 justify-end mt-2">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!disapproveReason.trim()) {
                        setDisapproveError('Debes ingresar un argumento.');
                        return;
                      }
                      setDisapproveLoading(true);
                      if (typeof onDisapprove === 'function') onDisapprove(shotData.id, disapproveReason);
                      setDisapproveLoading(false);
                      setShowDisapprove(false);
                      setDisapproveReason('');
                      setDisapproveError('');
                    }}
                    className="bg-red-600 text-white px-4 py-2 rounded font-semibold shadow hover:bg-red-700 transition-colors"
                    disabled={disapproveLoading}
                  >
                    Confirmar desaprobación
                  </button>
                  <button
                    onClick={() => { setShowDisapprove(false); setDisapproveReason(''); setDisapproveError(''); }}
                    className="bg-gray-700 text-white px-4 py-2 rounded font-semibold shadow"
                    disabled={disapproveLoading}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {isAdminMode && (
            <div className={`absolute top-2 right-2 transition-opacity duration-300 ${
              isApproved ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}>
              <button
                onClick={() => onApprove?.(shotData.id)}
                disabled={isApproved}
                className={`p-2 rounded-full transition-all duration-300 ${
                  isApproved
                    ? 'bg-[#D4AF37] text-black cursor-default'
                    : 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                }`}
                title={isApproved ? 'Aprobado' : 'Aprobar'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </button>
            </div>
          )}
        </div>

        <div className="mt-2 text-sm leading-tight">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold flex-1">{shotData.title}</p>
            {shotData.category_name && (
              <span className="px-2 py-0.5 bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-medium rounded-full whitespace-nowrap">
                {shotData.category_name}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-0.5">
            Creador: {shotData?.profiles?.[0]?.username ? `@${shotData.profiles[0].username}` : 'Sin Creador'}
          </p>
          <p className="text-gray-600 truncate">{shotData.description}</p>
        </div>
      </div>

      {isDetailModalOpen && <ShotModal shotData={shotData} onClose={() => setIsDetailModalOpen(false)} />}
    </>
  )
}