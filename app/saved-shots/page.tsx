"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../lib/AuthContext"
import { supabase } from "../../lib/supabase"
import { useRouter } from 'next/navigation'
import Header from "../../components/Header"
import Footer from "../../components/Footer"
import MasonryWall from "../../components/MasonryWall"

type Board = {
  id: number
  name: string
  created_at: string
}

export default function SavedShotsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [savedShotIds, setSavedShotIds] = useState<Set<number>>(new Set())
  const [boards, setBoards] = useState<Board[]>([])
  const [viewMode, setViewMode] = useState<"shots" | "boards">("shots")

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [loading, user, router])

  useEffect(() => {
    if (user) {
      const fetchSavedShots = async () => {
        const { data, error } = await supabase.from("saved_shots").select("shot_id").eq("user_id", user.id)
        if (!error && data) {
          const ids = new Set(data.map((item) => item.shot_id))
          setSavedShotIds(ids)
        }
      }
      fetchSavedShots()
    }
  }, [user])

  useEffect(() => {
    if (user) {
      const fetchBoards = async () => {
        const { data, error } = await supabase
          .from("boards")
          .select("id, name, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (!error && data) {
          setBoards(data)
        }
      }
      fetchBoards()
    }
  }, [user])

  if (loading) {
    return <p className="text-center mt-8 text-gray-500">Verificando...</p>
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto p-4">
        <h1 className="text-3xl font-bold text-center mb-6">Shots Guardados</h1>

        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setViewMode("shots")}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${
              viewMode === "shots" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Shots Guardados
          </button>
          <button
            onClick={() => setViewMode("boards")}
            className={`px-6 py-2 rounded-full font-medium transition-colors ${
              viewMode === "boards" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Mis Tableros ({boards.length})
          </button>
        </div>

        {viewMode === "shots" ? (
          <>
            <p className="text-center text-gray-600 mb-8">Toda tu inspiracion en un solo lugar.</p>
            <MasonryWall isLoggedIn={true} savedShotIds={savedShotIds} showOnlySaved={true} />
          </>
        ) : (
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-gray-600 mb-8">Organiza tus shots en tableros.</p>
            {boards.length === 0 ? (
              <p className="text-center text-gray-500">
                No tienes tableros aun. Guarda un shot para crear tu primer tablero.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {boards.map((board) => (
                  <div
                    key={board.id}
                    onClick={() => router.push(`/boards/${board.id}`)}
                    className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    <h3 className="text-xl font-bold mb-2">{board.name}</h3>
                    <p className="text-gray-500 text-sm">Creado el {new Date(board.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}