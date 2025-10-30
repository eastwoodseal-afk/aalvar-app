"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "../lib/AuthContext"
import AuthModal from "./AuthModal"
import UserMenuButton from "./UserMenuButton"

export default function Header() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const { user } = useAuth()

  console.log("El Header ve al usuario así:", user)

  const openAuthModal = () => setIsAuthModalOpen(true)
  const closeAuthModal = () => setIsAuthModalOpen(false)

  return (
    <>
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo y Título */}
            <Link href="/" className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
              <div className="flex-shrink-0 bg-blue-600 text-white font-bold px-3 py-1 rounded-lg mr-4">MP</div>
              <div className="hidden md:block">
                <div className="text-lg font-semibold">Mi Pinterest</div>
                <div className="text-sm text-gray-500">Descubre ideas</div>
              </div>
            </Link>

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
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              </div>

              {user ? (
                <UserMenuButton user={user} />
              ) : (
                <button
                  onClick={openAuthModal}
                  className="bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-colors"
                >
                  Iniciar Sesión
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {isAuthModalOpen && <AuthModal onClose={closeAuthModal} />}
    </>
  )
}