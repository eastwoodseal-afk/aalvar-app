"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useAuth } from '../../../lib/AuthContext';
import { supabase } from '../../../lib/supabase';
import { canAccessSection } from '../../../lib/roleUtils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRightPanel } from '../../../lib/RightPanelContext';
import Masonry from 'react-masonry-css';
import dynamic from 'next/dynamic';

const ShotModal = dynamic(() => import('../../../components/ShotModal'), { ssr: false });

type ShotData = {
  id: number;
  title: string;
  image_url: string;
  description: string;
  created_at: string;
};

type BoardData = {
  id: number;
  name: string;
};

function ShotsGuardadosContent() {
        const [showBoardSuccess, setShowBoardSuccess] = useState(false);
      // Eliminar tablero y sus asignaciones
      const handleDeleteBoard = async (boardId: number) => {
        if (!user) return;
        if (!window.confirm('¿Seguro que quieres eliminar este tablero y todas sus asignaciones?')) return;
        try {
          // Eliminar asignaciones de shots a este tablero
          await supabase.from('board_shots').delete().eq('board_id', boardId);
          // Eliminar el tablero
          await supabase.from('boards').delete().eq('id', boardId);
          // Refrescar tableros
          setBoards(prev => prev.filter(b => b.id !== boardId));
          // Refrescar contadores
          setBoardShotCounts(prev => {
            const copy = { ...prev };
            delete copy[boardId];
            return copy;
          });
        } catch (e) {
          alert('Error al eliminar el tablero');
        }
      };
    const [boardShotCounts, setBoardShotCounts] = useState<{ [boardId: number]: number }>({});
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedShotParam = searchParams.get('shot');
  const [selectedShotId, setSelectedShotId] = useState<number | null>(null);

  const [savedShots, setSavedShots] = useState<ShotData[]>([]);
  const [loadingShots, setLoadingShots] = useState(true);
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [draggedShotId, setDraggedShotId] = useState<number | null>(null);
  const [hoveredBoardId, setHoveredBoardId] = useState<number | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<'none' | 'all' | number>('none');
  const [boardShots, setBoardShots] = useState<ShotData[]>([]);
  const [loadingBoardShots, setLoadingBoardShots] = useState(false);
  const [boardCounts, setBoardCounts] = useState<{ [shotId: number]: number }>({});

  // Eliminar shot guardado
  const handleUnsaveShot = async (shotId: number) => {
    if (!user) return;
    try {
      // Eliminar de guardados
      await supabase
        .from('saved_shots')
        .delete()
        .eq('shot_id', shotId)
        .eq('user_id', user.id);

      // Eliminar de todos los tableros
      await supabase
        .from('board_shots')
        .delete()
        .eq('shot_id', shotId);

      setSavedShots((prev) => prev.filter((shot) => shot.id !== shotId));
      setBoardShots((prev) => prev.filter((shot) => shot.id !== shotId));
    } catch (e) {
      alert('Error al quitar de guardados');
    }
  };

  // Drag & Drop para asignar shots a tableros
  const handleDragStart = (shotId: number) => {
    setDraggedShotId(shotId);
  };
  const handleDragEnd = () => {
    setDraggedShotId(null);
  };
  const handleDropOnBoard = async (boardId: number) => {
    if (!draggedShotId || !user) return;
    try {
      await supabase
        .from('board_shots')
        .insert({ board_id: boardId, shot_id: draggedShotId });
      setDraggedShotId(null);
      // Actualizar lista local para que desaparezca de la vista general
      setShotsWithBoardIds(prev => ([...(prev || []), draggedShotId]));
      // Actualizar contador local inmediatamente
      setBoardShotCounts(prev => ({
        ...prev,
        [boardId]: (prev[boardId] || 0) + 1
      }));
      setShowBoardSuccess(true);
      setTimeout(() => setShowBoardSuccess(false), 1500);
    } catch (e) {
      alert('Error al asignar el shot al tablero');
    }
  };

  // Crear tablero
  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) {
      setIsCreatingBoard(false);
      setNewBoardName('');
      return;
    }
    if (!user) return;
    const { error } = await supabase
      .from('boards')
      .insert({ user_id: user.id, name: newBoardName.trim() });
    if (error) {
      alert('Error al crear tablero');
      return;
    }
    setIsCreatingBoard(false);
    setNewBoardName('');
    // Refetch boards y esperar a que termine antes de habilitar el drag-and-drop
    setLoadingBoards(true);
    const { data } = await supabase
      .from('boards')
      .select('id, name')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: true });
    setBoards(data || []);
    // Pequeño delay para asegurar render y sincronización
    setTimeout(() => setLoadingBoards(false), 100);
  };

  // Obtener conteo de shots por tablero
  useEffect(() => {
    if (!user) return;
    const fetchBoardShotCounts = async () => {
      try {
        const { data, error } = await supabase
          .from('board_shots')
          .select('board_id');
        if (error) throw error;
        const counts: { [boardId: number]: number } = {};
        (data || []).forEach((row: any) => {
          if (row.board_id in counts) {
            counts[row.board_id] += 1;
          } else {
            counts[row.board_id] = 1;
          }
        });
        setBoardShotCounts(counts);
      } catch (e) {
        setBoardShotCounts({});
      }
    };
    fetchBoardShotCounts();
  }, [user, savedShots]);

  // Efecto para cargar shots guardados
  useEffect(() => {
    if (!user) return;
    const fetchShots = async () => {
      setLoadingShots(true);
      try {
        const { data: savedData } = await supabase
          .from('saved_shots')
          .select('shot_id, created_at')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false });
        const shotIds = (savedData || []).map((s: any) => s.shot_id);
        if (shotIds.length === 0) {
          setSavedShots([]);
          setLoadingShots(false);
          return;
        }
        const { data: shotsData } = await supabase
          .from('shots')
          .select('id, title, image_url, description, created_at')
          .in('id', shotIds);
        setSavedShots(shotsData || []);
      } catch (e) {
        setSavedShots([]);
      } finally {
        setLoadingShots(false);
      }
    };
    fetchShots();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchBoards = async () => {
      try {
        const { data } = await supabase
          .from('boards')
          .select('id, name')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: true });
        setBoards(data || []);
      } catch (e) {
        setBoards([]);
      } finally {
        setLoadingBoards(false);
      }
    };
    fetchBoards();
  }, [user]);

  // Mantener lista de IDs de shots asignados a tableros
  const [shotsWithBoardIds, setShotsWithBoardIds] = useState<number[]>(

  );

  useEffect(() => {
    if (!user) return;
    const fetchShotsWithBoard = async () => {
      try {
        const { data: boardShotLinks } = await supabase
          .from('board_shots')
          .select('shot_id');
        setShotsWithBoardIds((boardShotLinks || []).map((s: any) => s.shot_id));
      } catch (e) {
        setShotsWithBoardIds([]);
      }
    };
    fetchShotsWithBoard();
  }, [user, savedShots]);

  useEffect(() => {
    if (!selectedBoardId || !user) return;
    setLoadingBoardShots(true);
    const fetchBoardShots = async () => {
      try {
        const { data: boardShotLinks } = await supabase
          .from('board_shots')
          .select('shot_id')
          .eq('board_id', selectedBoardId);
        const shotIds = (boardShotLinks || []).map((s: any) => s.shot_id);
        if (shotIds.length === 0) {
          setBoardShots([]);
          setLoadingBoardShots(false);
          return;
        }
        const { data: shotsData } = await supabase
          .from('shots')
          .select('id, title, image_url, description, created_at')
          .in('id', shotIds);
        setBoardShots(shotsData || []);
      } catch (e) {
        setBoardShots([]);
      } finally {
        setLoadingBoardShots(false);
      }
    };
    fetchBoardShots();
  }, [selectedBoardId, user]);

  useEffect(() => {
    if (!user) return;
    const fetchBoardCounts = async () => {
      try {
        const { data, error } = await supabase
          .from('board_shots')
          .select('shot_id');
        if (error) throw error;
        const counts: { [shotId: number]: number } = {};
        (data || []).forEach((row: any) => {
          if (row.shot_id in counts) {
            counts[row.shot_id] += 1;
          } else {
            counts[row.shot_id] = 1;
          }
        });
        setBoardCounts(counts);
      } catch (e) {
        setBoardCounts({});
      }
    };
    fetchBoardCounts();
  }, [user, savedShots]);

  // Renderizado
  if (authLoading || !user) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Cargando...</div>;
  }
  if (!canAccessSection(user.role, 'shots-guardados')) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">No tienes permisos para acceder a esta página</div>;
  }

  // Layout principal: dos paneles
  return (
    <div
      className="flex h-full w-full overflow-hidden"
      style={{
        minHeight: '100vh',
        width: '100%',
      }}
    >
      {/* Panel izquierdo: shots */}
      <div
        className="transition-all duration-300 overflow-y-auto flex-shrink"
        style={{
          width: selectedShotId ? 'calc(100% - 700px)' : 'calc(100% - 250px)',
          minWidth: selectedShotId ? '300px' : '400px',
          maxWidth: selectedShotId ? '60%' : '100%',
          alignSelf: 'flex-start',
        }}
      >
        <div className="flex flex-col md:flex-row h-full w-full">
          {/* Panel izquierdo: Muro persistente */}
          <div className="flex-1 overflow-y-auto scrollbar-hide transition-all duration-300 w-full">
            <div className="min-h-screen bg-black">
              <main className="container mx-auto p-4 relative">
                <section className="w-full text-left py-8 pl-15 pr-15">
                  <div className="flex items-center justify-start gap-2 flex-nowrap">
                    <h1 className="text-lg font-bold text-white whitespace-nowrap">
                        {selectedBoardId === 'none' ? 'Shots sin Tablero' : typeof selectedBoardId === 'number' ? 'Shots en Tablero' : 'Shots Guardados'}
                    </h1>
                    <p className="text-sm text-gray-300">
                        {selectedBoardId === 'none' ? 'Solo los shots que no están asignados a ningún tablero.' : typeof selectedBoardId === 'number' ? 'Solo los shots asignados a este tablero.' : 'Todos los shots que has guardado para ver más tarde.'}
                    </p>
                    {selectedBoardId && selectedBoardId !== 'none' && (
                      <button
                        onClick={() => setSelectedBoardId('none')}
                        className="ml-4 bg-gray-800 text-gray-300 px-3 py-1 rounded text-xs hover:bg-gray-700"
                      >Ver shots sin tablero</button>
                    )}
                  </div>
                </section>
                {/* Muro de shots guardados, shots sin tablero o shots del tablero */}
                {selectedBoardId === 'all' ? (
                  loadingShots ? (
                    <p className="text-center mt-8 text-gray-400">Cargando tus shots guardados...</p>
                  ) : savedShots.length === 0 ? (
                    <div className="text-center mt-12">
                      <p className="text-gray-400 text-lg mb-6">No has guardado ningún shot aún.</p>
                      <button onClick={() => router.push('/')} className="bg-[#D4AF37] text-black px-6 py-2 rounded-md hover:brightness-110 transition-all font-semibold">➕ Explorar Muro Principal</button>
                    </div>
                  ) : (
                    <div className="pl-15 pr-15">
                      <Masonry breakpointCols={{ default: 6, 1280: 6, 1024: 6, 768: 4, 640: 3 }} className="flex w-auto -ml-4" columnClassName="pl-4 bg-clip-padding">
                        {savedShots.map((shot) => (
                          <div
                            key={shot.id}
                            className="break-inside-avoid mb-4 group cursor-pointer"
                            draggable
                            onClick={() => setSelectedShotId(shot.id)}
                            onDragStart={() => handleDragStart(shot.id)}
                            onDragEnd={handleDragEnd}
                            style={{ opacity: draggedShotId === shot.id ? 0.5 : 1 }}
                          >
                            <div className="relative overflow-hidden rounded-xl">
                              <img 
                                src={shot.image_url || "/placeholder.svg"} 
                                alt={shot.title} 
                                className="w-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer" 
                                loading="lazy" 
                                decoding="async" 
                              />
                              <button
                                onClick={() => handleUnsaveShot(shot.id)}
                                className="absolute top-2 right-2 p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all duration-300"
                                title="Desvincular de guardados"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18.84 12.25l1.72-1.71h-.02a5.004 5.004 0 00-.12-7.07 5.006 5.006 0 00-7.07-.12l-1.24 1.24" />
                                  <path d="M5.17 11.75l-1.72 1.71a5.004 5.004 0 00.12 7.07 5.006 5.006 0 007.07.12l1.24-1.24" />
                                  <line x1="8" y1="2" x2="8" y2="5" />
                                  <line x1="2" y1="8" x2="5" y2="8" />
                                  <line x1="16" y1="19" x2="16" y2="22" />
                                  <line x1="19" y1="16" x2="22" y2="16" />
                                </svg>
                              </button>
                              {boardCounts[shot.id] > 0 && (
                                <span className="absolute bottom-2 right-2 bg-[#D4AF37] text-black text-xs px-2 py-1 rounded-full shadow">{boardCounts[shot.id]} tablero{boardCounts[shot.id] > 1 ? 's' : ''}</span>
                              )}
                            </div>
                            <div className="mt-2 text-sm leading-tight">
                              <p className="font-semibold text-white">{shot.title}</p>
                              <p className="text-gray-400 truncate">{shot.description}</p>
                            </div>
                          </div>
                        ))}
                      </Masonry>
                    </div>
                  )
                ) : selectedBoardId === 'none' ? (
                  loadingShots ? (
                    <p className="text-center mt-8 text-gray-400">Cargando tus shots guardados...</p>
                  ) : savedShots.filter(shot => !(shotsWithBoardIds || []).includes(shot.id)).length === 0 ? (
                    <div className="text-center mt-12">
                      <p className="text-gray-400 text-lg mb-6">No tienes shots sin asignar.</p>
                      <button onClick={() => router.push('/')} className="bg-[#D4AF37] text-black px-6 py-2 rounded-md hover:brightness-110 transition-all font-semibold">➕ Explorar Muro Principal</button>
                    </div>
                  ) : (
                    <div className="pl-15 pr-15">
                      <Masonry breakpointCols={{ default: 6, 1280: 6, 1024: 6, 768: 4, 640: 3 }} className="flex w-auto -ml-4" columnClassName="pl-4 bg-clip-padding">
                        {savedShots.filter(shot => !(shotsWithBoardIds || []).includes(shot.id)).map((shot) => (
                          <div
                            key={shot.id}
                            className="break-inside-avoid mb-4 group cursor-pointer"
                            draggable
                            onClick={() => setSelectedShotId(shot.id)}
                            onDragStart={() => handleDragStart(shot.id)}
                            onDragEnd={handleDragEnd}
                            style={{ opacity: draggedShotId === shot.id ? 0.5 : 1 }}
                          >
                            <div className="relative overflow-hidden rounded-xl">
                              <img 
                                src={shot.image_url || "/placeholder.svg"} 
                                alt={shot.title} 
                                className="w-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer" 
                                loading="lazy" 
                                decoding="async" 
                              />
                              <button
                                onClick={() => handleUnsaveShot(shot.id)}
                                className="absolute top-2 right-2 p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all duration-300"
                                title="Desvincular de guardados"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18.84 12.25l1.72-1.71h-.02a5.004 5.004 0 00-.12-7.07 5.006 5.006 0 00-7.07-.12l-1.24 1.24" />
                                  <path d="M5.17 11.75l-1.72 1.71a5.004 5.004 0 00.12 7.07 5.006 5.006 0 007.07.12l1.24-1.24" />
                                  <line x1="8" y1="2" x2="8" y2="5" />
                                  <line x1="2" y1="8" x2="5" y2="8" />
                                  <line x1="16" y1="19" x2="16" y2="22" />
                                  <line x1="19" y1="16" x2="22" y2="16" />
                                </svg>
                              </button>
                              {boardCounts[shot.id] > 0 && (
                                <span className="absolute bottom-2 right-2 bg-[#D4AF37] text-black text-xs px-2 py-1 rounded-full shadow">{boardCounts[shot.id]} tablero{boardCounts[shot.id] > 1 ? 's' : ''}</span>
                              )}
                            </div>
                            <div className="mt-2 text-sm leading-tight">
                              <p className="font-semibold text-white">{shot.title}</p>
                              <p className="text-gray-400 truncate">{shot.description}</p>
                            </div>
                          </div>
                        ))}
                      </Masonry>
                    </div>
                  )
                ) : (
                  loadingBoardShots ? (
                    <p className="text-center mt-8 text-gray-400">Cargando shots del tablero...</p>
                  ) : boardShots.length === 0 ? (
                    <div className="text-center mt-12">
                      <p className="text-gray-400 text-lg mb-6">No hay shots en este tablero.</p>
                    </div>
                  ) : (
                    <div className="pl-15 pr-15">
                      <Masonry breakpointCols={{ default: 6, 1280: 6, 1024: 6, 768: 4, 640: 3 }} className="flex w-auto -ml-4" columnClassName="pl-4 bg-clip-padding">
                        {boardShots.map((shot) => (
                          <div
                            key={shot.id}
                            className="break-inside-avoid mb-4 group cursor-pointer"
                            draggable
                            onClick={() => setSelectedShotId(shot.id)}
                            onDragStart={() => handleDragStart(shot.id)}
                            onDragEnd={handleDragEnd}
                            style={{ opacity: draggedShotId === shot.id ? 0.5 : 1 }}
                          >
                            <div className="relative overflow-hidden rounded-xl">
                              <img 
                                src={shot.image_url || "/placeholder.svg"} 
                                alt={shot.title} 
                                className="w-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer" 
                                loading="lazy" 
                                decoding="async" 
                              />
                              <button
                                onClick={() => handleUnsaveShot(shot.id)}
                                className="absolute top-2 right-2 p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all duration-300"
                                title="Desvincular de guardados"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18.84 12.25l1.72-1.71h-.02a5.004 5.004 0 00-.12-7.07 5.006 5.006 0 00-7.07-.12l-1.24 1.24" />
                                  <path d="M5.17 11.75l-1.72 1.71a5.004 5.004 0 00.12 7.07 5.006 5.006 0 007.07.12l1.24-1.24" />
                                  <line x1="8" y1="2" x2="8" y2="5" />
                                  <line x1="2" y1="8" x2="5" y2="8" />
                                  <line x1="16" y1="19" x2="16" y2="22" />
                                  <line x1="19" y1="16" x2="22" y2="16" />
                                </svg>
                              </button>
                              {boardCounts[shot.id] > 0 && (
                                <span className="absolute bottom-2 right-2 bg-[#D4AF37] text-black text-xs px-2 py-1 rounded-full shadow">{boardCounts[shot.id]} tablero{boardCounts[shot.id] > 1 ? 's' : ''}</span>
                              )}
                            </div>
                            <div className="mt-2 text-sm leading-tight">
                              <p className="font-semibold text-white">{shot.title}</p>
                              <p className="text-gray-400 truncate">{shot.description}</p>
                            </div>
                          </div>
                        ))}
                      </Masonry>
                    </div>
                  )
                )}
              </main>
            </div>
          </div>
        </div>
      </div>
      {/* Panel derecho: tableros y detalle */}
      <div
        className={`h-full overflow-y-auto bg-gray-950 pl-6 pr-20 scrollbar-hide transition-all duration-300 relative flex flex-col items-end flex-shrink-0 ${selectedShotId ? '' : 'w-fit min-w-fit max-w-fit'}`}
        style={{
          width: selectedShotId ? '700px' : undefined,
          minWidth: selectedShotId ? '700px' : undefined,
          maxWidth: selectedShotId ? '700px' : undefined,
          alignSelf: 'flex-start',
        }}
      >
        {/* Mostrar solo un contenedor según el estado */}
        {selectedShotId ? (
          (() => {
            const shot = savedShots.find(s => s.id === selectedShotId) || boardShots.find(s => s.id === selectedShotId);
            if (!shot) {
              setTimeout(() => setSelectedShotId(null), 0);
              return <div className="p-8 text-gray-400">No se encontró el shot.</div>;
            }
            return (
              <div className="space-y-4 w-full max-w-[700px]">
                {/* Detalle del shot, igual que ShotModal */}
                <div className="bg-gray-900 rounded-xl w-full">
                  <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-bold text-white truncate">{shot.title}</h2>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => setSelectedShotId(null)} className="text-gray-400 hover:text-gray-200 p-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="mb-6 rounded-lg overflow-hidden bg-black">
                      <img src={shot.image_url || "/placeholder.svg"} alt={shot.description || "shot"} className="w-full h-auto object-contain" loading="eager" />
                    </div>
                    {shot.description && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white mb-2">Descripción</h3>
                        <p className="text-gray-300 whitespace-pre-wrap">{shot.description}</p>
                      </div>
                    )}
                    <div className="border-t border-gray-800 pt-4 text-sm text-gray-400">
                      <p>Publicado: {shot.created_at ? new Date(shot.created_at).toLocaleString("es-ES") : ''}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="space-y-4 w-fit max-w-full relative mt-15">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Tableros</h2>
              {showBoardSuccess && (
                <div className="text-[#D4AF37] font-semibold mb-2 text-sm">¡Shot asignado al tablero correctamente!</div>
              )}
              <p className="text-sm text-gray-400">Arrastra un shot aquí para organizarlo</p>
            </div>
            <div className="space-y-1.5">
              {/* Botón 'Todos los shots' */}
              <button
                className={`w-full flex items-center justify-between py-2 px-3 rounded-lg border transition-all mb-1 ${selectedBoardId === 'all' ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-semibold' : 'bg-gray-900 border-gray-800 text-white hover:border-[#D4AF37]/50'}`}
                onClick={() => setSelectedBoardId('all')}
              >
                <span className="text-sm">📌 Todos los shots</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-black/15">{savedShots.length}</span>
              </button>
              {/* Botón 'Sin asignar' */}
              <button
                className={`w-full flex items-center justify-between py-2 px-3 rounded-lg border transition-all mb-1 ${selectedBoardId === 'none' ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-semibold' : 'bg-gray-900 border-gray-800 text-white hover:border-[#D4AF37]/50'}`}
                onClick={() => setSelectedBoardId('none')}
              >
                <span className="text-sm">Sin asignar</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-black/15">{savedShots.filter(s => !(shotsWithBoardIds ?? []).includes(s.id)).length}</span>
              </button>
              {/* Botones de tableros */}
              {boards.map(board => (
                <div key={board.id} className="relative flex items-center group"
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDropOnBoard(board.id)}
                >
                  <button
                    className={`flex-1 flex items-center justify-between py-2 px-3 rounded-lg border transition-all mb-1 ${selectedBoardId === board.id ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-semibold' : 'bg-gray-900 border-gray-800 text-white hover:border-[#D4AF37]/50'}`}
                    onClick={() => setSelectedBoardId(board.id)}
                  >
                    <span className="text-sm">{board.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-black/15">{boardShotCounts[board.id] || 0}</span>
                    <span className="mx-2 h-5 w-px bg-gray-700" />
                    <span
                      role="button"
                      tabIndex={0}
                      className="p-1 rounded-full hover:bg-red-700/20 transition-colors cursor-pointer"
                      title="Eliminar tablero"
                      onClick={e => { e.stopPropagation(); handleDeleteBoard(board.id); }}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleDeleteBoard(board.id); } }}
                    >
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <rect x="5" y="6" width="14" height="14" rx="2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </span>
                  </button>
                </div>
              ))}
              {/* Crear tablero */}
              <div className="mt-3">
                {isCreatingBoard ? (
                  <form onSubmit={e => { e.preventDefault(); handleCreateBoard(); }} className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 px-2 py-1 rounded border border-gray-700 bg-gray-800 text-white"
                      value={newBoardName}
                      onChange={e => setNewBoardName(e.target.value)}
                      placeholder="Nombre del tablero"
                      autoFocus
                    />
                    <button type="submit" className="px-3 py-1 rounded bg-[#D4AF37] text-black font-semibold">Crear</button>
                    <button type="button" className="px-2 py-1 rounded bg-gray-700 text-white" onClick={() => setIsCreatingBoard(false)}>Cancelar</button>
                  </form>
                ) : (
                  <button className="w-full py-2 px-3 rounded-lg border border-gray-700 bg-gray-800 text-white hover:bg-gray-700" onClick={() => setIsCreatingBoard(true)}>
                    + Crear tablero
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




export default function ShotsGuardadosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Cargando...</div>}>
      <ShotsGuardadosContent />
    </Suspense>
  );
}



