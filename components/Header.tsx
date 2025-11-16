"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "../lib/AuthContext"
import UserMenuButton from "./UserMenuButton"

export default function Header({ onLoginClick, onLogoClick }: { onLoginClick?: () => void; onLogoClick?: () => void } = {}) {
  const { user } = useAuth()

  const pathname = usePathname()
  const isMyShots = pathname === '/mis-shots'
  const isSavedShots = pathname === '/shots-guardados'


  return (
  <header className="bg-gray-950 shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo y Título */}
            {onLogoClick ? (
              <button
                onClick={onLogoClick}
                className="flex-shrink-0 bg-blue-600 text-white font-bold px-3 py-1 rounded-lg mr-4 cursor-pointer hover:opacity-80 transition-opacity"
                title="Ir al inicio"
              >
                MP
              </button>
            ) : (
              <Link href="/" className="flex-shrink-0 bg-blue-600 text-white font-bold px-3 py-1 rounded-lg mr-4 cursor-pointer hover:opacity-80 transition-opacity" title="Inicio">
                MP
              </Link>
            )}

            {/* Título sin Link */}
            <div className="hidden md:block">
              <div className="text-lg font-semibold">Mi Pinterest</div>
              <div className="text-sm text-gray-500">Descubre ideas</div>
            </div>

            {/* Barra de Búsqueda */}
            <div className="flex-1 max-w-md mx-4">
              <input
                type="text"
                placeholder="Buscar shots..."
                className="w-full px-4 py-2 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Iconos y Botón de Login/Usuario */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex space-x-2">
                {/* Botón Mis Shots */}
                <Link
                  href="/mis-shots"
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isMyShots
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title="Mis Shots"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                  </svg>
                </Link>

                {/* Botón Shots Guardados */}
                <Link
                  href="/shots-guardados"
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isSavedShots
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title="Shots Guardados"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                </Link>
              </div>

              {user ? (
                <UserMenuButton user={user} />
              ) : (
                <button
                  onClick={onLoginClick}
                  className="bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                  Iniciar Sesión
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
  )
}