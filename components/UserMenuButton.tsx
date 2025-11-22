"use client"

import { useState, useRef, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import type { UserWithRole } from "../lib/roleUtils"
import { supabase } from "../lib/supabase"
import { canAccessSection } from "../lib/roleUtils"
import Link from "next/link"
import CreateShotModal from "./CreateShotModal"
import { useRouter } from "next/navigation"

export default function UserMenuButton({ user }: { user: User | UserWithRole }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  // Ya no usaremos modal directo para crear; navegaremos a la ruta /crear-shot
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const router = useRouter()
  const [username, setUsername] = useState<string>("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const role = ((user as any)?.role as import("../lib/roleUtils").UserRole) || 'subscriber'
  const borderClass = role === 'subscriber'
    ? 'border-2 border-[#E4007C]'
    : role === 'member'
    ? 'border-2 border-[#0047AB]'
    : role === 'admin'
    ? 'border-2 border-[#D4AF37]'
    : 'border-2 border-[#FF6A00]'
  const ringColorClass = role === 'subscriber'
    ? 'focus-visible:ring-[#E4007C] hover:ring-[#E4007C]'
    : role === 'member'
    ? 'focus-visible:ring-[#0047AB] hover:ring-[#0047AB]'
    : role === 'admin'
    ? 'focus-visible:ring-[#D4AF37] hover:ring-[#D4AF37]'
    : 'focus-visible:ring-[#FF6A00] hover:ring-[#FF6A00]'

  const userInitial = username ? username.charAt(0).toUpperCase() : (user.email?.charAt(0).toUpperCase() ?? "U")

  useEffect(() => {
    const fetchUsername = async () => {
      const { data, error } = await supabase.from("profiles").select("username").eq("id", user.id).single()

      if (!error && data) {
        setUsername(data.username || user.email || "Usuario")
      } else {
        setUsername(user.email || "Usuario")
      }
    }
    const fetchAvatar = async () => {
      try {
        const { data } = await supabase.auth.getUser()
        const meta: any = data.user?.user_metadata || {}
        const url: string | undefined = meta.avatar_url || meta.picture || meta.avatarUrl
        setAvatarUrl(url || null)
      } catch {
        setAvatarUrl(null)
      }
    }
    fetchUsername()
    fetchAvatar()
  }, [user.id, user.email])

  // Refrescar username al abrir el menú (por si fue actualizado en /perfil)
  useEffect(() => {
    if (!isMenuOpen) return
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single()
        if (!error && data?.username) {
          setUsername(data.username)
        }
      } catch {}
    })()
  }, [isMenuOpen, user.id])

  // Determine if the current user role is allowed to create shots.
  // If the auth `user` object doesn't include a `role` (raw Supabase User),
  // this will evaluate to false and the menu will show the disabled label.
  const hasCreatePermission = (user as any)?.role ? canAccessSection((user as any).role, 'create-shots') : false

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuRef])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Error al cerrar sesión:", error.message)
    } else {
      setIsMenuOpen(false)
      // Redirect to main wall after logout for consistent UX
      router.push('/')
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`group flex items-center justify-center w-10 h-10 rounded-full bg-gray-300 hover:bg-gray-400 transition-colors overflow-hidden ${borderClass} ring-transparent focus-visible:ring-2 hover:ring-2 ring-offset-2 ring-offset-gray-900 ${ringColorClass}`}
        aria-label="Menú de usuario"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={username || 'Avatar'}
            className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
            onError={() => setAvatarUrl(null)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-gray-700 font-semibold">{userInitial}</span>
        )}
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
          <button
            onClick={() => {
              setIsMenuOpen(false);
              router.push('/perfil');
            }}
            className={`block w-full text-left px-4 py-2 text-sm font-semibold text-gray-900 border-b transition-colors ${
              role === 'superadmin'
                ? 'bg-[#FF6A00]/10 hover:bg-[#FF6A00]/20'
                : role === 'admin'
                ? 'bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20'
                : role === 'member'
                ? 'bg-[#0047AB]/10 hover:bg-[#0047AB]/20'
                : 'bg-[#E4007C]/10 hover:bg-[#E4007C]/20'
            }`}
          >
            {username}
          </button>

          {role === 'subscriber' ? (
            <div
              className="block w-full text-left px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
              title="Disponible para miembros"
              aria-disabled="true"
            >
              Mis Shots — disponible para miembros
            </div>
          ) : (
            <Link href="/mis-shots" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              Mis Shots
            </Link>
          )}
          <Link href="/shots-guardados" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            Shots Guardados
          </Link>

          {/* Create option: enabled for users with permission, otherwise show disabled label */}
          {hasCreatePermission ? (
            <button
              onClick={() => {
                setIsMenuOpen(false)
                router.push('/crear-shot')
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Crear un Shot
            </button>
          ) : (
            <div
              className="block w-full text-left px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
              title="Disponible para miembros"
              aria-disabled="true"
            >
              Crear un Shot — disponible para miembros
            </div>
          )}

          {(role === 'admin' || role === 'superadmin') && (
            <Link href="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              Panel de Administración
            </Link>
          )}

          <hr className="my-1" />

          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Cerrar Sesión
          </button>
        </div>
      )}

  {/* Mantener compatibilidad: si en algún momento se reactiva el modo modal */}
  {isCreateModalOpen && <CreateShotModal onClose={() => setIsCreateModalOpen(false)} />}
    </div>
  )
}