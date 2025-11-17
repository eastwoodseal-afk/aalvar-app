"use client";

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../../../../lib/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

interface Board {
  id: number;
  name: string;
  count?: number;
}

function ShotsGuardadosPanelContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedBoardId = searchParams.get('tablero');
  const showAll = searchParams.get('todos') === 'true';
  const selectedShotId = searchParams.get('shot');
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOverBoardId, setDragOverBoardId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });
  const [shotDetail, setShotDetail] = useState<any>(null);
  const [loadingShot, setLoadingShot] = useState(false);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [confirmingBoardId, setConfirmingBoardId] = useState<number | null>(null);
  const [boardFeedback, setBoardFeedback] = useState<{ boardId: number; type: 'added' | 'exists' } | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchBoards = async () => {
      try {
        const { data, error } = await supabase
          .from('boards')
          .select('id, name')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching boards:', error);
          return;
        }

        // Contar shots por tablero
        const boardsWithCount = await Promise.all(
          (data || []).map(async (board) => {
            const { count } = await supabase
              .from('board_shots')
              .select('*', { count: 'exact', head: true })
              .eq('board_id', board.id);
            
            return { ...board, count: count || 0 };
          })
        );

        setBoards(boardsWithCount);
      } catch (e) {
        console.error('Error fetching boards:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchBoards();
  }, [user]);

  // Fetch shot detail cuando hay selectedShotId
  useEffect(() => {
    if (!selectedShotId) {
      setShotDetail(null);
      return;
    }

    const fetchShotDetail = async () => {
      setLoadingShot(true);
      try {
        const { data, error } = await supabase
          .from('shots')
          .select('*')
          .eq('id', parseInt(selectedShotId))
          .single();

        if (error) {
          console.error('Error fetching shot:', error);
          return;
        }

        setShotDetail(data);
      } catch (e) {
        console.error('Error fetching shot detail:', e);
      } finally {
        setLoadingShot(false);
      }
    };

    fetchShotDetail();
  }, [selectedShotId]);

  const handleBoardClick = (boardId: number | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (boardId === null) {
      // Mostrar todos los guardados
      params.delete('tablero');
      params.set('todos', 'true');
    } else {
      params.set('tablero', String(boardId));
      params.delete('todos');
    }
    const qs = params.toString();
    router.push(qs ? `/shots-guardados?${qs}` : '/shots-guardados');
  };

  const handleNewBoard = () => {
    setIsCreatingBoard(true);
  };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) {
      setIsCreatingBoard(false);
      setNewBoardName('');
      return;
    }

    const { error } = await supabase
      .from('boards')
      .insert({ user_id: user!.id, name: newBoardName.trim() });

    if (error) {
      alert('Error al crear tablero');
      return;
    }

    // Recargar tableros
    const { data } = await supabase
      .from('boards')
      .select('id, name')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: true });

    if (data) {
      const boardsWithCount = await Promise.all(
        data.map(async (board) => {
          const { count } = await supabase
            .from('board_shots')
            .select('*', { count: 'exact', head: true })
            .eq('board_id', board.id);
          
          return { ...board, count: count || 0 };
        })
      );
      setBoards(boardsWithCount);
    }

    setIsCreatingBoard(false);
    setNewBoardName('');
  };

  const handleCancelCreate = () => {
    setIsCreatingBoard(false);
    setNewBoardName('');
  };

  const handleRequestDeleteBoard = (e: React.MouseEvent, boardId: number) => {
    e.stopPropagation();
    setConfirmingBoardId(boardId);
  };

  const handleCancelDeleteBoard = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmingBoardId(null);
  };

  const handleConfirmDeleteBoard = async (e: React.MouseEvent, boardId: number) => {
    e.stopPropagation();
    if (!user) return;

    try {
      // Eliminar relaciones primero para evitar problemas si no hay cascade
      await supabase.from('board_shots').delete().eq('board_id', boardId);

      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', boardId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting board:', error);
        setToast({ message: '⚠️ Error al eliminar tablero', show: true });
        setTimeout(() => setToast({ message: '', show: false }), 2000);
        return;
      }

      setBoards(prev => prev.filter(b => b.id !== boardId));

      // Si estaba seleccionado, volver a "Todos"
      if (selectedBoardId === String(boardId)) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('tablero');
        params.set('todos', 'true');
        router.push(`/shots-guardados?${params.toString()}`);
      }

      setToast({ message: '✓ Tablero eliminado', show: true });
      setTimeout(() => setToast({ message: '', show: false }), 2000);
    } catch (err) {
      console.error('Unexpected error deleting board:', err);
    } finally {
      setConfirmingBoardId(null);
    }
  };

  // Drag & drop handlers: accept shot id as text/plain and add to board_shots
  const handleDropOnBoard = async (boardId: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverBoardId(null);
    const shotIdStr = e.dataTransfer.getData('text/plain');
    const shotId = shotIdStr ? parseInt(shotIdStr, 10) : null;
    if (!user || !shotId) return;

    try {
      const { error } = await supabase
        .from('board_shots')
        .insert({ board_id: boardId, shot_id: shotId });

      // Si ya existe (código 23505), no hacer nada
      if (error) {
        if (error.code === '23505') {
          // Ya existe, mostrar overlay feedback
          setBoardFeedback({ boardId, type: 'exists' });
          setTimeout(() => setBoardFeedback(null), 1500);
        } else {
          console.error('Error adding shot to board:', error);
        }
        return;
      }

      // Solo incrementar si se insertó exitosamente
      setBoards(prev => prev.map(b => b.id === boardId ? { ...b, count: (b.count || 0) + 1 } : b));
      // Mostrar overlay de éxito
      setBoardFeedback({ boardId, type: 'added' });
      setTimeout(() => setBoardFeedback(null), 1500);
    } catch (err) {
      console.error('Error handling drop:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent, boardId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverBoardId(boardId);
  };

  const handleDragLeave = (boardId: number) => {
    setDragOverBoardId(prev => (prev === boardId ? null : prev));
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-950 p-6 scrollbar-hide relative flex flex-col items-end">
      {/* Toast notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 bg-[#D4AF37] text-black px-4 py-2 rounded-lg shadow-lg animate-fade-in-out">
          {toast.message}
        </div>
      )}

      {/* Si hay un shot seleccionado, mostrar detalle */}
      {shotDetail ? (
        <div className="space-y-4 w-full max-w-md">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{shotDetail.title}</h2>
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete('shot');
                router.push(`/shots-guardados?${params.toString()}`);
              }}
              aria-label="Cerrar"
              className="px-2 py-1 rounded-md bg-[#B08A2E] hover:bg-[#A07C25] text-black text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition-colors"
            >
              ✕
            </button>
          </div>

          {shotDetail.image_url && (
            <div className="w-full overflow-hidden rounded-lg border border-gray-900 bg-black">
              <img
                src={shotDetail.image_url}
                alt={shotDetail.title}
                className="w-full h-auto object-contain"
                loading="lazy"
              />
            </div>
          )}

          {shotDetail.description && (
            <p className="text-gray-300 whitespace-pre-wrap text-sm">{shotDetail.description}</p>
          )}

          {shotDetail.created_at && (
            <div className="text-xs text-gray-500">
              <span>Publicado: {new Date(shotDetail.created_at).toLocaleString()}</span>
              {shotDetail.is_approved === false && (
                <span className="ml-2 inline-block px-2 py-0.5 rounded bg-yellow-900/30 text-yellow-300">Pendiente</span>
              )}
            </div>
          )}
        </div>
      ) : (
        // Vista normal: lista de tableros
        <div className="space-y-4 w-full max-w-md">
          {/* Header */}
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Tableros</h2>
            <p className="text-sm text-gray-400">Organiza tus shots guardados en colecciones</p>
          </div>

        {/* Botón: Todos los guardados */}
        <button
          onClick={() => handleBoardClick(null)}
          className={`w-full text-left py-2 px-3 rounded-lg border transition-all ${
            showAll
              ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-semibold'
              : 'bg-gray-900 border-gray-800 text-white hover:border-[#D4AF37]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm">📌 Todos los guardados</span>
            <span className="text-xs opacity-70">Ver todo</span>
          </div>
        </button>

        {/* Lista de tableros */}
        <div className="space-y-1.5">
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-4">Cargando tableros...</p>
          ) : boards.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No tienes tableros aún. Crea uno para organizar tus shots.
            </p>
          ) : (
            boards.map((board) => (
              <button
                key={board.id}
                onClick={() => handleBoardClick(board.id)}
                onDragOver={(e) => handleDragOver(e, board.id)}
                onDragEnter={(e) => handleDragOver(e, board.id)}
                onDragLeave={() => handleDragLeave(board.id)}
                onDrop={(e) => handleDropOnBoard(board.id, e)}
                className={`relative w-full text-left py-2 px-3 rounded-lg border transition-all ${
                  selectedBoardId === String(board.id)
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-semibold'
                    : 'bg-gray-900 border-gray-800 text-white hover:border-[#D4AF37]/50'
                } ${dragOverBoardId === board.id ? 'ring-2 ring-[#D4AF37]/50' : ''}`}
              >
                <div className="flex items-center">
                  <span className="text-sm truncate flex-1">{board.name}</span>
                  <div className="flex items-center ml-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedBoardId === String(board.id) ? 'bg-black/15' : 'bg-black/20'
                    }`}>
                      {board.count}
                    </span>
                    {/* Separador visual dentro del botón, al extremo derecho */}
                    <div className={`${selectedBoardId === String(board.id) ? 'bg-black/30' : 'bg-gray-700'} h-5 w-px mx-2`} />
                    {/* Icono de eliminar tablero */}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleRequestDeleteBoard(e, board.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRequestDeleteBoard(e as any, board.id); }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        selectedBoardId === String(board.id)
                          ? 'bg-black/15 text-black'
                          : 'bg-gray-800 text-gray-300'
                      } hover:bg-red-600 hover:text-white ${confirmingBoardId === board.id ? 'bg-red-600 text-white ring-2 ring-red-400' : ''}`}
                      title="Eliminar tablero"
                      aria-label="Eliminar tablero"
                    >
                      {/* Icono de basura reducido */}
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Overlay de confirmación */}
                {confirmingBoardId === board.id && (
                  <div className="absolute inset-0 rounded-lg bg-black/70 backdrop-blur-[1px] flex items-center justify-center gap-4">
                    <span className="text-sm text-white/90 mr-2 hidden sm:inline">¿Eliminar tablero?</span>
                    <button
                      onClick={(e) => handleConfirmDeleteBoard(e, board.id)}
                      className="w-9 h-9 rounded-full bg-[#D4AF37] text-black flex items-center justify-center hover:bg-[#B08A2E] shadow"
                      title="Aceptar"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={handleCancelDeleteBoard}
                      className="w-9 h-9 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-gray-700 shadow"
                      title="Cancelar"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                {boardFeedback && boardFeedback.boardId === board.id && confirmingBoardId !== board.id && (
                  <div className={`absolute inset-0 rounded-lg overflow-hidden flex items-center justify-center text-center animate-board-feedback pointer-events-none ${
                    boardFeedback.type === 'added' ? 'bg-green-600/85 text-white' : 'bg-yellow-500/85 text-black'
                  }`}> 
                    <span className="text-sm font-semibold tracking-wide select-none">
                      {boardFeedback.type === 'added' ? '✓ Añadido al tablero' : 'ℹ️ Ya estaba aquí'}
                    </span>
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Botón/Input: Crear tablero */}
        {isCreatingBoard ? (
          <div className="w-full py-2 px-3 rounded-lg border-2 border-[#D4AF37] bg-gray-900">
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateBoard();
                if (e.key === 'Escape') handleCancelCreate();
              }}
              onBlur={handleCreateBoard}
              autoFocus
              placeholder="Nombre del tablero..."
              className="w-full bg-transparent text-white text-sm outline-none placeholder:text-gray-500"
            />
          </div>
        ) : (
          <button
            onClick={handleNewBoard}
            className="w-full py-2 px-3 rounded-lg border-2 border-dashed border-gray-700 text-gray-400 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all text-sm"
          >
            ➕ Crear nuevo tablero
          </button>
        )}
      </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar{display:none;} 
        .scrollbar-hide{scrollbar-width:none;}
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translateY(-10px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        .animate-fade-in-out {
          animation: fade-in-out 2s ease-in-out;
        }
        @keyframes board-feedback {
          0% { opacity: 0; transform: scale(0.92); }
          15% { opacity: 1; transform: scale(1); }
          85% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.98); }
        }
        .animate-board-feedback { animation: board-feedback 1.5s ease-in-out forwards; }
      `}</style>
    </div>
  );
}

export default function ShotsGuardadosPanel() {
  return (
    <Suspense fallback={<div className="h-full bg-gray-950 p-6 flex items-center justify-center text-gray-400">Cargando tableros...</div>}>
      <ShotsGuardadosPanelContent />
    </Suspense>
  );
}
