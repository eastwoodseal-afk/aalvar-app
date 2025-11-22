"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "../lib/AuthContext"
import { useRightPanel } from "../lib/RightPanelContext"
import UserMenuButton from "./UserMenuButton"
import { Cormorant_Garamond } from 'next/font/google'

// Fuente elegante (no Times) para logotipo, título y subtítulo
const garamond = Cormorant_Garamond({ subsets: ['latin'], weight: ['400','500','600','700'] })

function HeaderContent({ onLogoClick, onLoginClick }: { onLogoClick?: () => void; onLoginClick?: () => void }) {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setRightPanel } = useRightPanel()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')

  const pathname = usePathname()
  const isMyShots = pathname === '/mis-shots'
  const isSavedShots = pathname === '/shots-guardados'

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
  <header className="bg-gray-950 shadow-sm border-b border-[#B08A2E] sticky top-0 z-50">
        {/* Full-width container now; match main content horizontal padding (p-4) */}
  <div className="w-full px-20">
          {/* Mobile: stack logo+buttons row, then search bar below */}
          {/* Desktop (md+): single row with absolute-centered search */}
          <div className="flex flex-col md:block">
            {/* Top row: logo + title + buttons (Desktop: h-16, Mobile: h-14) */}
            <div className="relative flex items-center h-16 md:h-20">
              {/* Logo y Título */}
              <button
                onClick={() => {
                  setRightPanel(null);
                  router.push('/');
                  onLogoClick?.();
                }}
                className={`${garamond.className} flex-shrink-0 bg-[#D4AF37] text-white px-3 md:px-4 py-1.5 rounded-lg mr-4 md:mr-10 cursor-pointer hover:brightness-110 transition-all tracking-wide font-semibold`}
                title="Inicio"
              >
                <span className="md:hidden block text-xl">A'AL</span>
                <span className="hidden md:block text-3xl">A'AL</span>
              </button>

              {/* Título y subtítulo institucional (solo desktop) */}
              <div className={`hidden md:flex flex-col items-start mr-4 ${garamond.className} leading-tight`}> 
                <div className="text-left inline-block text-2xl font-bold uppercase tracking-[0.10em] text-white">
                  ATENEO DE ARQUITECTURA
                </div>
                <div className="text-left inline-block text-base mt-1 uppercase tracking-[0.20em] text-gray-300">
                  <span className="text-2xl font-bold tracking-[0.10em]">LATINOAMERICANA</span><span className="text-sm">, VALOR Y REGISTRO</span>
                </div>
              </div>

              {/* Barra de Búsqueda (Desktop only) */}
              <div className="hidden md:block px-4 w-full max-w-xs ml-8">
                <form onSubmit={handleSearch}>
                  <input
                    type="text"
                    placeholder="Buscar shots..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-1 rounded-full bg-gray-700 text-gray-100 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] text-sm"
                  />
                </form>
              </div>

              {/* Iconos y Botón de Login/Usuario */}
              <div className="ml-auto flex items-center space-x-6 md:space-x-8 overflow-visible">
              {/* Botones circulares: visibles siempre; deshabilitados si no hay sesión */}
              <div className="hidden md:flex items-center gap-2">
                {/* Home - Tepee (V invertida) */}
                <button
                  onClick={() => {
                    setRightPanel(null);
                    router.push('/');
                    onLogoClick?.();
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    pathname === '/'
                      ? 'bg-[#D4AF37] text-black'
                      : 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                  }`}
                  title="Inicio"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3L4 20h16L12 3z" />
                  </svg>
                </button>

                {/* Mis Shots */}
                {user ? (
                  <button
                    onClick={() => {
                      setRightPanel(null);
                      router.push('/mis-shots');
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isMyShots
                        ? 'bg-[#D4AF37] text-black'
                        : 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                    }`}
                    title="Mis Shots"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                    </svg>
                  </button>
                ) : (
                  <div className="relative group">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 text-gray-400 cursor-not-allowed group"
                      aria-disabled="true"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
                      </svg>
                    </div>
                    <div className="z-50 pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800/95 backdrop-blur px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      Inicia sesión para ver Mis Shots
                    </div>
                  </div>
                )}

                {/* Shots Guardados */}
                {user ? (
                  <button
                    onClick={() => {
                      setRightPanel(null);
                      if (isSavedShots) {
                        // Si ya está en la ruta, no recargar, solo actualizar la URL si es necesario
                        if (typeof window !== 'undefined') {
                          const url = new URL(window.location.href);
                          url.searchParams.delete('shot');
                          window.history.replaceState({}, '', url.pathname + url.search);
                        }
                      } else {
                        router.push('/shots-guardados');
                      }
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isSavedShots
                        ? 'bg-[#D4AF37] text-black'
                        : 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                    }`}
                    title="Shots Guardados"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                    </svg>
                  </button>
                ) : (
                  <div className="relative group">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 text-gray-400 cursor-not-allowed group"
                      aria-disabled="true"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                      </svg>
                    </div>
                    <div className="z-50 pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800/95 backdrop-blur px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      Inicia sesión para ver Shots Guardados
                    </div>
                  </div>
                )}

                {/* Separador visual */}
                <div className="w-px h-6 bg-gray-700"></div>

                {/* Crear Shot */}
                {user ? (
                  <button
                    onClick={() => {
                      setRightPanel({ type: 'modal', modal: 'crear-shot' });
                      if (isMyShots) {
                        // Solo actualizar el parámetro modal en la URL, sin recargar la sección
                        if (typeof window !== 'undefined') {
                          const url = new URL(window.location.href);
                          url.searchParams.set('modal', 'crear-shot');
                          window.history.replaceState({}, '', url.pathname + url.search);
                        }
                      } else {
                        // Navegación completa si se llama desde fuera de mis shots
                        router.push('/mis-shots?modal=crear-shot');
                      }
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      searchParams.get('modal') === 'crear-shot'
                        ? 'bg-[#D4AF37] text-black'
                        : 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                    }`}
                    title="Crear Shot"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                ) : (
                  <div className="relative group">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-300 text-gray-400 cursor-not-allowed group"
                      aria-disabled="true"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="z-50 pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800/95 backdrop-blur px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      Inicia sesión para crear Shots
                    </div>
                  </div>
                )}

                {/* Separador visual derecho, alineado simétricamente al del lado izquierdo */}
                <div className="w-px h-6 bg-gray-700"></div>
              </div>

              {user ? (
                <UserMenuButton user={user} />
              ) : (
                <button
                  onClick={() => {
                    setRightPanel({ type: 'modal', modal: 'auth' });
                    router.push('/?modal=auth');
                    onLoginClick?.();
                  }}
                    className="bg-gray-700 text-gray-100 px-4 py-2 rounded-full hover:bg-gray-600 transition-colors"
                >
                  Iniciar Sesión
                </button>
              )}
            </div>
          </div>

          {/* Mobile search bar: full-width row below logo+buttons */}
          <div className="md:hidden pb-3">
            <form onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Buscar shots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1 rounded-full bg-gray-700 text-gray-100 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] text-sm"
              />
            </form>
          </div>
        </div>
      </div>
      </header>
  )
}

export default function Header({ onLogoClick, onLoginClick }: { onLogoClick?: () => void; onLoginClick?: () => void }) {
  return (
    <Suspense fallback={<div className="bg-black border-b border-gray-800 h-20"></div>}>
      <HeaderContent onLogoClick={onLogoClick} onLoginClick={onLoginClick} />
    </Suspense>
  )
}