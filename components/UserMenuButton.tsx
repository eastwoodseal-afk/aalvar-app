"use client"

import { useState, useRef, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import type { UserWithRole } from "../lib/roleUtils"
import { supabase } from "../lib/supabase"
import { canAccessSection } from "../lib/roleUtils"
import Link from "next/link"
import CreateShotModal from "./CreateShotModal"

export default function UserMenuButton({ user }: { user: User | UserWithRole }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [username, setUsername] = useState<string>("")
  const menuRef = useRef<HTMLDivElement>(null)

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
    fetchUsername()
  }, [user.id, user.email])

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
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-300 hover:bg-gray-400 transition-colors"
      >
        <span className="text-gray-700 font-semibold">{userInitial}</span>
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
          <div className="px-4 py-2 text-sm text-gray-700 border-b">{username}</div>

          <Link href="/mis-shots" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            Mis Shots
          </Link>
          <Link href="/shots-guardados" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            Shots Guardados
          </Link>

          {/* Create option: enabled for users with permission, otherwise show disabled label */}
          {hasCreatePermission ? (
            <button
              onClick={() => setIsCreateModalOpen(true)}
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

          <Link href="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
            Panel de Administración
          </Link>

          <hr className="my-1" />

          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Cerrar Sesión
          </button>
        </div>
      )}

      {isCreateModalOpen && <CreateShotModal onClose={() => setIsCreateModalOpen(false)} />}
    </div>
  )
}