"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useAuth } from '../../../lib/AuthContext';
import { supabase } from '../../../lib/supabase';
import { canAccessSection } from '../../../lib/roleUtils';
import { useRouter, useSearchParams } from 'next/navigation';
import Masonry from 'react-masonry-css';

interface ShotData {
  id: number;
  image_url: string;
  title: string;
  description?: string;
  user_id?: string;
  is_approved?: boolean;
  created_at?: string;
}

interface SavedShot {
  id: string;
  shot_id: string;
  created_at: string;
  shots: ShotData[];
}

function ShotsGuardadosContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedBoardId = searchParams.get('tablero');
  const showAll = searchParams.get('todos') === 'true'; // nuevo param para "todos"
  const [savedShots, setSavedShots] = useState<SavedShot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);

  const PAGE_SIZE = 30;
  // Helper para mapear datos combinados
  const mapToSavedShots = (savedData: any[], shotsData: any[]): SavedShot[] => {
    return savedData.map(saved => {
      const shot = shotsData?.find((s: any) => s.id === saved.shot_id);
      return {
        id: `saved_${saved.shot_id}`,
        shot_id: saved.shot_id,
        created_at: saved.created_at,
        shots: shot ? [shot] : []
      };
    }).filter(item => item.shots.length > 0);
  };

  const fetchPage = useCallback(async (pageIndex: number) => {
    if (!user) return;
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Si hay un tablero seleccionado, filtrar por board_shots
      if (selectedBoardId) {
        const { data: boardShots, error: boardError } = await supabase
          .from('board_shots')
          .select('shot_id')
          .eq('board_id', parseInt(selectedBoardId))
          .order('created_at', { ascending: false })
          .range(from, to);

        if (boardError) {
          console.error('Error fetching board shots:', boardError);
          setHasMore(false);
          return;
        }

        if (!boardShots || boardShots.length === 0) {
          if (pageIndex === 0) setSavedShots([]);
          setHasMore(false);
          return;
        }

        const shotIds = boardShots.map(bs => bs.shot_id);
        const { data: shotsData, error: shotsError } = await supabase
          .from('shots')
          .select('id, title, image_url, description, created_at')
          .in('id', shotIds);

        if (shotsError) {
          console.error('Error fetching shots:', shotsError);
          return;
        }

        const combined = boardShots.map(bs => {
          const shot = shotsData?.find((s: any) => s.id === bs.shot_id);
          return {
            id: `board_${selectedBoardId}_${bs.shot_id}`,
            shot_id: bs.shot_id,
            created_at: new Date().toISOString(),
            shots: shot ? [shot] : []
          };
        }).filter(item => item.shots.length > 0);

        setSavedShots(prev => pageIndex === 0 ? combined : [...prev, ...combined]);
        setHasMore(boardShots.length === PAGE_SIZE);
        setPage(pageIndex + 1);
      } else {
        // Sin filtro: si showAll=true -> todos los saved_shots; si no -> solo los guardados SIN tablero
        const { data: savedData, error: savedError } = await supabase
          .from('saved_shots')
          .select('shot_id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(from, to);

        if (savedError) {
          console.error('Error fetching saved shot IDs:', savedError);
          setHasMore(false);
          return;
        }

        if (!savedData || savedData.length === 0) {
          if (pageIndex === 0) setSavedShots([]);
          setHasMore(false);
          return;
        }

        const shotIds = savedData.map(s => s.shot_id);

        if (showAll) {
          // Mostrar todos los guardados
          const { data: shotsData, error: shotsError } = await supabase
            .from('shots')
            .select('id, title, image_url, description, created_at')
            .in('id', shotIds);

          if (shotsError) {
            console.error('Error fetching shots:', shotsError);
            return;
          }

          const combined = mapToSavedShots(savedData, shotsData || []);
          setSavedShots(prev => pageIndex === 0 ? combined : [...prev, ...combined]);
          setHasMore(savedData.length === PAGE_SIZE);
          setPage(pageIndex + 1);
        } else {
          // Mostrar solo los guardados SIN tablero (no asignados a ningún board)
          const { data: assignedRows, error: assignedError } = await supabase
            .from('board_shots')
            .select('shot_id')
            .in('shot_id', shotIds);

          if (assignedError) {
            console.error('Error fetching assigned board_shots:', assignedError);
            return;
          }

          const assignedIds = new Set((assignedRows || []).map((r: any) => r.shot_id));
          const unassignedSaved = savedData.filter(s => !assignedIds.has(s.shot_id));

          if (!unassignedSaved || unassignedSaved.length === 0) {
            // No hay guardados sin tablero en este rango
            if (pageIndex === 0) setSavedShots([]);
            // mantener paginación conservadora
            setHasMore(savedData.length === PAGE_SIZE);
            setPage(pageIndex + 1);
            return;
          }

          const unassignedIds = unassignedSaved.map(s => s.shot_id);
          const { data: shotsData, error: shotsError } = await supabase
            .from('shots')
            .select('id, title, image_url, description, created_at')
            .in('id', unassignedIds);

          if (shotsError) {
            console.error('Error fetching shots:', shotsError);
            return;
          }

          const combined = mapToSavedShots(unassignedSaved, shotsData || []);
          setSavedShots(prev => pageIndex === 0 ? combined : [...prev, ...combined]);
          setHasMore(savedData.length === PAGE_SIZE);
          setPage(pageIndex + 1);
        }
      }
    } catch (error) {
      console.error('Error fetching page saved shots:', error);
      if (pageIndex === 0) setSavedShots([]);
      setHasMore(false);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, selectedBoardId]);

  const fetchFirstPage = () => {
    setLoading(true);
    fetchPage(0);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth');
      return;
    }
    if (!canAccessSection(user.role, 'shots-guardados')) {
      router.push('/');
      return;
    }
    fetchFirstPage();
  }, [authLoading, user, router, selectedBoardId]);

  // IntersectionObserver para infinite scroll
  useEffect(() => {
    if (!hasMore || loading) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && !loadingMore) {
        setLoadingMore(true);
        fetchPage(page);
      }
    }, { rootMargin: '200px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, fetchPage]);

  const handleUnsaveShot = async (savedShotId: string) => {
    try {
      const actualShotId = parseInt(savedShotId.replace(/^(saved_|board_\d+_)/, ''), 10);
      const { error } = await supabase
        .from('saved_shots')
        .delete()
        .eq('shot_id', actualShotId)
        .eq('user_id', user?.id);
      if (error) {
        console.error('Error unsaving shot:', error);
        alert('Error al quitar de guardados');
        return;
      }
      setSavedShots(prev => prev.filter(saved => saved.id !== savedShotId));
    } catch (error) {
      console.error('Error unsaving shot:', error);
      alert('Error al quitar de guardados');
    }
  };

  const handleShotClick = (shotId: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('shot', shotId.toString());
    router.push(`/shots-guardados?${params.toString()}`);
  };

  if (authLoading || !user) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Cargando...</div>;
  }
  if (!canAccessSection(user.role, 'shots-guardados')) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">No tienes permisos para acceder a esta página</div>;
  }

  // Vista normal: muro + panel de tableros (layout renderiza el @panel)
  return (
    <div className="min-h-screen bg-black">
      <main className="container mx-auto p-4 relative">
              {/* Indicador circular en esquina superior derecha */}
              <div className="absolute top-8 right-0 z-10">
                <div className="relative group">
                  <div className="w-10 h-10 rounded-full bg-gray-800 border border-[#D4AF37] flex items-center justify-center text-white text-sm font-semibold">
                    {savedShots.length}
                  </div>
                  <div className="absolute right-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-gray-800/95 backdrop-blur px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Shots Guardados
                  </div>
                </div>
              </div>
              <section className="w-full text-left py-8 pl-15 pr-15">
                <div className="flex items-center justify-start gap-2 flex-nowrap">
                  <h1 className="text-lg font-bold text-white whitespace-nowrap">Shots Guardados</h1>
                  <p className="text-sm text-gray-300">
                    {selectedBoardId ? 'Filtrando por tablero seleccionado' : 'Todos los shots que has guardado para ver más tarde.'}
                  </p>
                </div>
              </section>

              {loading ? (
                <p className="text-center mt-8 text-gray-400">Cargando tus shots guardados...</p>
              ) : savedShots.length === 0 ? (
                <div className="text-center mt-12">
                  <p className="text-gray-400 text-lg mb-6">No has guardado ningún shot aún.</p>
                  <button onClick={() => router.push('/')} className="bg-[#D4AF37] text-black px-6 py-2 rounded-md hover:brightness-110 transition-all font-semibold">➕ Explorar Muro Principal</button>
                </div>
              ) : (
                <div className="pl-15 pr-15">
                  <Masonry breakpointCols={{ default: 6, 1280: 6, 1024: 6, 768: 4, 640: 3 }} className="flex w-auto -ml-4" columnClassName="pl-4 bg-clip-padding">
                    {savedShots.map((savedShot) => {
                      if (!savedShot.shots || savedShot.shots.length === 0) return null;
                      const shot = savedShot.shots[0];
                      return (
                        <div
                          key={savedShot.id}
                          className="break-inside-avoid mb-4 group cursor-pointer"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', String(shot.id));
                            e.dataTransfer.effectAllowed = 'copy';
                            e.currentTarget.classList.add('opacity-70');
                          }}
                          onDragEnd={(e) => {
                            try { e.currentTarget.classList.remove('opacity-70'); } catch {}
                          }}
                        >
                          <div className="relative overflow-hidden rounded-xl">
                            <img 
                              src={shot.image_url || "/placeholder.svg"} 
                              alt={shot.title} 
                              className="w-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer" 
                              loading="lazy" 
                              decoding="async" 
                              onClick={() => handleShotClick(shot.id)}
                            />
                            <button onClick={(e) => { e.stopPropagation(); handleUnsaveShot(savedShot.id); }} className="absolute top-2 right-2 p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all duration-300 opacity-0 group-hover:opacity-100" title="Desvincular de guardados">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18.84 12.25l1.72-1.71h-.02a5.004 5.004 0 00-.12-7.07 5.006 5.006 0 00-7.07-.12l-1.24 1.24" />
                                <path d="M5.17 11.75l-1.72 1.71a5.004 5.004 0 00.12 7.07 5.006 5.006 0 007.07.12l1.24-1.24" />
                                <line x1="8" y1="2" x2="8" y2="5" />
                                <line x1="2" y1="8" x2="5" y2="8" />
                                <line x1="16" y1="19" x2="16" y2="22" />
                                <line x1="19" y1="16" x2="22" y2="16" />
                              </svg>
                            </button>
                          </div>
                          <div className="mt-2 text-sm leading-tight">
                            <p className="font-semibold text-white">{shot.title}</p>
                            <p className="text-gray-400 truncate">{shot.description}</p>
                          </div>
                        </div>
                      );
                    })}
                    {hasMore && (
                      <div ref={sentinelRef} className="w-full h-10 flex items-center justify-center col-span-full">
                        {loadingMore && <span className="text-xs text-gray-500 animate-pulse">Cargando más...</span>}
                      </div>
                    )}
                  </Masonry>
                </div>
              )}
            </main>
            <footer className="bg-gray-900 border-t border-gray-700 mt-8">
              <div className="p-4 text-center text-gray-400 text-sm">Footer</div>
            </footer>
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
