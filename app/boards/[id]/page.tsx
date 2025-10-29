"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../../lib/AuthContext"
import { supabase } from "../../../lib/supabase"
import { useRouter, useParams } from 'next/navigation'
import Header from "../../../components/Header"
import Footer from "../../../components/Footer"
import Masonry from "react-masonry-css"
import Shot from "../../../components/Shot"

type ShotData = {
  id: number
  image_url: string
  title: string
  description: string
  user_id: string
}

type Board = {
  id: number
  name: string
}

export default function BoardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const boardId = params.id as string
  const [board, setBoard] = useState<Board | null>(null)
  const [shots, setShots] = useState<ShotData[]>([])
  const [savedShotIds, setSavedShotIds] = useState<Set<number>>(new Set())
  const [loadingShots, setLoadingShots] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [loading, user, router])

  useEffect(() => {
    if (user && boardId) {
      const fetchBoard = async () => {
        const { data, error } = await supabase
          .from("boards")
          .select("id, name")
          .eq("id", boardId)
          .eq("user_id", user.id)
          .single()

        if (error || !data) {
          alert("Tablero no encontrado")
          router.push("/mis-shots")
          return
        }

        setBoard(data)
      }

      const fetchBoardShots = async () => {
        const { data, error } = await supabase
          .from("board_shots")
          .select("shot_id, shots(id, title, image_url, description, user_id)")
          .eq("board_id", boardId)

        if (error) {
          console.error("Error fetching board shots:", error)
          setLoadingShots(false)
          return
        }

        const formattedShots = data
          .map((item: any) => item.shots)
          .filter((shot: any) => shot !== null)
          .map((shot: any) => ({
            id: shot.id,
            image_url: shot.image_url,
            title: shot.title,
            description: shot.description,
            user_id: shot.user_id,
          }))

        setShots(formattedShots)
        setLoadingShots(false)
      }

      const fetchSavedShots = async () => {
        const { data, error } = await supabase.from("saved_shots").select("shot_id").eq("user_id", user.id)
        if (!error && data) {
          const ids = new Set(data.map((item) => item.shot_id))
          setSavedShotIds(ids)
        }
      }

      fetchBoard()
      fetchBoardShots()
      fetchSavedShots()
    }
  }, [user, boardId, router])

  if (loading || loadingShots) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <p className="text-center mt-8 text-gray-500">Cargando...</p>
        <Footer />
      </div>
    )
  }

  if (!user || !board) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto p-4">
        <div className="mb-6">
          <button onClick={() => router.push("/mis-shots")} className="text-blue-600 hover:underline mb-4">
            ← Volver a Mis Shots
          </button>
          <h1 className="text-3xl font-bold">{board.name}</h1>
          <p className="text-gray-600 mt-2">{shots.length} shots guardados</p>
        </div>

        {shots.length === 0 ? (
          <p className="text-center text-gray-500">Este tablero está vacío. Guarda algunos shots para verlos aquí.</p>
        ) : (
          <Masonry
            breakpointCols={{
              default: 6,
              1280: 6,
              1024: 6,
              768: 4,
              640: 3,
            }}
            className="flex w-auto -ml-4"
            columnClassName="pl-4 bg-clip-padding"
          >
            {shots.map((shot) => (
              <Shot
                key={shot.id}
                isLoggedIn={true}
                shotData={shot}
                isInitiallySaved={savedShotIds.has(shot.id)}
              />
            ))}
          </Masonry>
        )}
      </main>

      <Footer />
    </div>
  )
}