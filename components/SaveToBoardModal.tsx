"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../lib/AuthContext"
import { supabase } from "../lib/supabase"

type Board = {
  id: number
  name: string
}

type SaveToBoardModalProps = {
  shotId: number
  onClose: () => void
  onSaved?: () => void
}

export default function SaveToBoardModal({ shotId, onClose, onSaved }: SaveToBoardModalProps) {
  const { user } = useAuth()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newBoardName, setNewBoardName] = useState("")

  useEffect(() => {
    if (!user) return
    const fetchBoards = async () => {
      const { data, error } = await supabase
        .from("boards")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error fetching boards:", error)
      } else {
        setBoards(data || [])
      }
    }
    fetchBoards()
  }, [user])

  const handleSave = async () => {
    if (!user) return

    setLoading(true)

    if (selectedBoardId) {
      const { data: existing } = await supabase
        .from("board_shots")
        .select("id")
        .eq("board_id", selectedBoardId)
        .eq("shot_id", shotId)
        .single()

      if (existing) {
        alert("Este shot ya está en el tablero seleccionado.")
        setLoading(false)
        return
      }

      const { error: insertError } = await supabase
        .from("board_shots")
        .insert({ board_id: selectedBoardId, shot_id: shotId })

      if (insertError) {
        console.error("Error inserting into board_shots:", insertError)
        alert("Error al guardar en el tablero.")
        setLoading(false)
        return
      }
    }

    const { error: saveError } = await supabase.from("saved_shots").insert({ user_id: user.id, shot_id: shotId })

    if (saveError && saveError.code !== "23505") {
      console.error("Error inserting into saved_shots:", saveError)
      alert("Error al guardar el shot.")
    } else {
      if (selectedBoardId) {
        alert("¡Shot guardado en el tablero!")
      } else {
        alert("¡Shot guardado!")
      }
      onSaved?.()
      onClose()
    }
    setLoading(false)
  }

  const handleCreateBoard = async () => {
    if (!user || !newBoardName.trim()) {
      alert("Por favor, introduce un nombre para el tablero.")
      return
    }
    setIsCreating(true)
    const { error } = await supabase
      .from("boards")
      .insert({ user_id: user.id, name: newBoardName.trim() })
      .select("id, name")
      .single()

    if (error) {
      alert("Error al crear el tablero.")
    } else {
      setNewBoardName("")
      setIsCreating(false)
      const { data } = await supabase
        .from("boards")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
      setBoards(data || [])
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Guardar shot</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">
            &times;
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Selecciona un tablero (opcional)</label>
            <select
              value={selectedBoardId || ""}
              onChange={(e) => setSelectedBoardId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37]"
            >
              <option value="">-- Sin tablero --</option>
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">O crea uno nuevo</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Nombre del nuevo tablero"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37]"
              />
              <button
                onClick={handleCreateBoard}
                disabled={isCreating}
                className="bg-[#D4AF37] text-black px-4 py-2 font-semibold rounded-md hover:brightness-110 disabled:opacity-50"
              >
                {isCreating ? "..." : "Crear"}
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 disabled:opacity-50 mt-4"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}
