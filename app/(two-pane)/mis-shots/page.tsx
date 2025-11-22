"use client";

import { useState, useEffect, useRef, useCallback, Suspense, useMemo } from 'react';
import { useAuth } from '../../../lib/AuthContext';
import { supabase } from '../../../lib/supabase';
import { canAccessSection } from '../../../lib/roleUtils';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRightPanel } from '../../../lib/RightPanelContext';
import Masonry from 'react-masonry-css';
import dynamic from 'next/dynamic';

const ShotModal = dynamic(() => import('../../../components/ShotModal'), { ssr: false });
const CreateShotModal = dynamic(() => import('../../../components/CreateShotModal'), { ssr: false });
const AuthModal = dynamic(() => import('../../../components/AuthModal'), { ssr: false });

type ShotData = {
  id: number;
  image_url: string;
  title: string;
  description?: string;
  user_id?: string;
  is_approved: boolean;
};


function MisShotsContent() {
    // Handler para eliminar shot
    const handleDeleteShot = async (shotId: number) => {
      if (!confirm('¿Estás seguro de que quieres eliminar este shot?')) return;
      try {
        const { error } = await supabase
          .from('shots')
          .update({ is_active: false })
          .eq('id', shotId)
          .eq('user_id', user?.id);
        if (error) {
          console.error('Error deleting shot:', error);
          alert('Error al eliminar el shot');
          return;
        }
        setShots(prev => prev.filter(shot => shot.id !== shotId));
        alert('Shot eliminado correctamente');
      } catch (error) {
        console.error('Error deleting shot:', error);
        alert('Error al eliminar el shot');
      }
    };
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedShotParam = searchParams.get('shot');
  const selectedShot = selectedShotParam ? parseInt(selectedShotParam, 10) : null;

  const [shots, setShots] = useState<ShotData[]>([]);
  const { rightPanel, setRightPanel } = useRightPanel();
  const hasRightPanel = !!rightPanel;
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);

  // Filtros
  const filterStatus = searchParams.get('estado');
  const [counts, setCounts] = useState({ total: 0, aprobados: 0, pendientes: 0 });
  const [loadingCounts, setLoadingCounts] = useState(false);

  // Memoización para evitar renders innecesarios
  const filteredShots = useMemo(() => {
    if (!filterStatus) return shots;
    if (filterStatus === 'aprobados') return shots.filter(s => s.is_approved);
    if (filterStatus === 'pendientes') return shots.filter(s => !s.is_approved);
    return shots;
  }, [shots, filterStatus]);

  const PAGE_SIZE = 30;

  const fetchPage = useCallback(async (pageIndex: number) => {
    if (!user) return;
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from('shots')
        .select('id, title, image_url, description, user_id, is_approved')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (filterStatus === 'aprobados') query = query.eq('is_approved', true);
      if (filterStatus === 'pendientes') query = query.eq('is_approved', false);
      const { data, error } = await query;
      if (error) {
        console.error('Error fetching shots:', error);
        setHasMore(false);
        return;
      }
      if (!data || data.length === 0) {
        if (pageIndex === 0) setShots([]);
        setHasMore(false);
        return;
      }
      setShots(prev => pageIndex === 0 ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      setPage(pageIndex + 1);
    } catch (error) {
      console.error('Error fetching page shots:', error);
      if (pageIndex === 0) setShots([]);
      setHasMore(false);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, filterStatus]);

  const fetchFirstPage = () => {
    setLoading(true);
    fetchPage(0);
  };

  // Fetch counts para filtros
  // Memoización para conteos
  useEffect(() => {
    if (!user) return;
    setLoadingCounts(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from('shots')
          .select('id, is_approved')
          .eq('user_id', user.id)
          .eq('is_active', true);
        if (error) {
          console.error('Error fetching shot counts:', error);
          return;
        }
        const total = data?.length || 0;
        const aprobados = data?.filter(s => s.is_approved).length || 0;
        const pendientes = data?.filter(s => !s.is_approved).length || 0;
        setCounts({ total, aprobados, pendientes });
      } catch (e) {
        console.error('Error fetching counts:', e);
      } finally {
        setLoadingCounts(false);
      }
    })();
  }, [user, shots]);

  // Recargar shots al crear uno nuevo
  useEffect(() => {
    const handleShotCreated = () => {
      fetchFirstPage();
    };
    window.addEventListener('shot-created', handleShotCreated);
    return () => {
      window.removeEventListener('shot-created', handleShotCreated);
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth');
      return;
    }
    if (!canAccessSection(user.role, 'my-shots')) {
      router.push('/');
      return;
    }
    // Solo recargar si no es un cambio shallow de 'modal' (evita flasheo)
    const modalParam = searchParams.get('modal');
    if (!modalParam) {
      fetchFirstPage();
    }
  }, [authLoading, user, router, filterStatus, searchParams]);

  // Infinite scroll
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

  // Sincronizar query params con rightPanel (shot y modal)
  useEffect(() => {
    const modalParam = searchParams.get('modal');
    if (selectedShot) {
      const shotInList = shots.find(s => s.id === selectedShot);
      if (shotInList) {
        if (!rightPanel || rightPanel.type !== 'shot' || rightPanel.shot?.id !== selectedShot) {
          setRightPanel({ type: 'shot', shot: shotInList });
        }
      } else {
        supabase
          .from('shots')
          .select('id, title, image_url, description, user_id, is_approved, created_at')
          .eq('id', selectedShot)
          .single()
          .then(({ data }) => {
            if (data) {
              setRightPanel({ type: 'shot', shot: data });
            }
          });
      }
    } else if (modalParam === 'crear-shot') {
      if (!rightPanel || rightPanel.type !== 'modal' || rightPanel.modal !== 'crear-shot') {
        setRightPanel({ type: 'modal', modal: 'crear-shot' });
      }
    } else {
      if (rightPanel) {
        setRightPanel(null);
      }
    }
  }, [selectedShot, shots, searchParams, rightPanel, setRightPanel]);

  // Handlers

  // Handler para abrir el modal 'Crear Shot' sin flasheo
  const handleOpenCrearShotModal = () => {
    setRightPanel({ type: 'modal', modal: 'crear-shot' });
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('modal', 'crear-shot');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  };

  const handleShotClick = (shotId: number) => {
    const shot = shots.find(s => s.id === shotId);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('modal');
    params.set('shot', shotId.toString());
    if (shot) setRightPanel({ type: 'shot', shot });
    router.push(`/mis-shots?${params.toString()}`);
  };

  const handleClosePanel = () => {
    setRightPanel(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('shot');
    params.delete('modal');
    router.push(`/mis-shots?${params.toString()}`);
  };

  const handleFilterClick = (filter: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === null) {
      params.delete('estado');
    } else {
      params.set('estado', filter);
    }
    params.delete('shot');
    const qs = params.toString();
    router.push(qs ? `/mis-shots?${qs}` : '/mis-shots');
  };

  if (authLoading || !user) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Cargando...</div>;
  }
  if (!canAccessSection(user.role, 'my-shots')) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">No tienes permisos para acceder a esta página</div>;
  }

  return (
    <div className="flex flex-col md:flex-row h-full w-full">
      {/* Panel izquierdo: Muro persistente */}
      <div className={`flex-1 overflow-y-auto scrollbar-hide transition-all duration-300 ${
        hasRightPanel ? 'md:w-[60%] border-r border-black border-[1.5px]' : 'w-full'
      }`}>
        <div className="min-h-screen bg-black">
          <main className="container mx-auto p-4 relative">

            <section className="w-full text-left py-8 pl-15 pr-15">
              <div className="flex items-center justify-start gap-2 flex-nowrap">
                <h1 className="text-lg font-bold text-white whitespace-nowrap">
                  {filterStatus === 'aprobados' ? 'Mis Shots Aprobados' 
                   : filterStatus === 'pendientes' ? 'Mis Shots Pendientes' 
                   : 'Mis Shots'}
                </h1>
                <p className="text-sm text-gray-300">
                  {filterStatus === 'aprobados' ? 'Mostrando shots aprobados'
                   : filterStatus === 'pendientes' ? 'Mostrando shots pendientes de aprobación'
                   : 'Mostrando todos tus shots'}
                </p>
              </div>
            </section>
            {loading ? (
              <p className="text-center mt-8 text-gray-400">Cargando tus shots...</p>
            ) : filteredShots.length === 0 ? (
              <div className="text-center mt-12">
                <p className="text-gray-400 text-lg mb-6">
                  {filterStatus ? 'No hay shots en esta categoría.' : 'No has creado ningún shot aún.'}
                </p>
              </div>
            ) : (
              <div className="pl-15 pr-15">
                <Masonry breakpointCols={{ default: 6, 1280: 6, 1024: 6, 768: 4, 640: 3 }} className="flex w-auto -ml-4" columnClassName="pl-4 bg-clip-padding">
                  {filteredShots.map((shot: ShotData) => (
                    <div 
                      key={shot.id} 
                      className="break-inside-avoid mb-4 group cursor-pointer"
                    >
                      <div className={`relative overflow-hidden rounded-xl border-2 transition-all duration-200 ${shot.is_approved 
                        ? 'border-green-500 group-hover:ring-2 group-hover:ring-green-400/70'
                        : 'border-[#D4AF37] group-hover:ring-2 group-hover:ring-[#D4AF37]/70'}`}>
                        <img 
                          src={shot.image_url || "/placeholder.svg"} 
                          alt={shot.title} 
                          className="w-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer" 
                          loading="lazy" 
                          decoding="async" 
                          onClick={() => handleShotClick(shot.id)}
                        />
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteShot(shot.id); }} className="absolute top-2 right-2 p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all duration-300 opacity-0 group-hover:opacity-100" title="Eliminar">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </button>
                      </div>
                      <div className="mt-2 text-sm leading-tight">
                        <p className="font-semibold text-white">{shot.title}</p>
                        <p className="text-gray-400 truncate">
                          {shot.description && shot.description.includes('://')
                            ? ''
                            : shot.description}
                        </p>
                      </div>
                    </div>
                  ))}
                  {hasMore && (
                    <div ref={sentinelRef} className="w-full h-10 flex items-center justify-center col-span-full">
                      {loadingMore && <span className="text-xs text-gray-500 animate-pulse">Cargando más...</span>}
                    </div>
                  )}
                </Masonry>
              </div>
            )}
          </main>
          <footer className="bg-gray-900 border-t border-gray-700 mt-8"><div className="p-4 text-center text-gray-400 text-sm">Footer</div></footer>
        </div>
      </div>

      {/* Panel derecho: Detalle / Modal / Filtros */}
      <div className="h-full overflow-y-auto bg-gray-950 pl-6 pr-20 scrollbar-hide transition-all duration-300 md:w-auto min-w-fit relative flex flex-col items-end">
        
        {/* Mostrar solo un contenedor según el estado */}
        {rightPanel?.type === 'shot' && rightPanel.shot ? (
          <div className="space-y-4 w-full max-w-[700px]">
            <ShotModal shotData={rightPanel.shot} onClose={handleClosePanel} embedded={true} />
          </div>
        ) : (
          <div className="space-y-4 w-full max-w-[250px] relative mt-15">
            {/* Filtros permanentes */}
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Filtrar por Estado</h2>
              <p className="text-sm text-gray-400">Organiza tus shots según su estado de aprobación</p>
            </div>
            {/* Botón: Todos */}
            <button
              onClick={() => handleFilterClick(null)}
              className={`w-full text-left py-2 px-3 rounded-lg border transition-all ${
                !filterStatus
                  ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-semibold'
                  : 'bg-gray-900 border-gray-800 text-white hover:border-[#D4AF37]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">📌 Todos mis shots</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  !filterStatus ? 'bg-black/15' : 'bg-black/20'
                }`}>
                  {loadingCounts ? '...' : counts.total}
                </span>
              </div>
            </button>
            {/* Lista de filtros */}
            <div className="space-y-1.5">
              {/* Aprobados */}
              <button
                onClick={() => handleFilterClick('aprobados')}
                className={`w-full text-left py-2 px-3 rounded-lg border transition-all ${
                  filterStatus === 'aprobados'
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-semibold'
                    : 'bg-gray-900 border-gray-800 text-white hover:border-[#D4AF37]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">✅ Aprobados</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    filterStatus === 'aprobados' ? 'bg-black/15' : 'bg-black/20'
                  }`}>
                    {loadingCounts ? '...' : counts.aprobados}
                  </span>
                </div>
              </button>
              {/* Pendientes */}
              <button
                onClick={() => handleFilterClick('pendientes')}
                className={`w-full text-left py-2 px-3 rounded-lg border transition-all ${
                  filterStatus === 'pendientes'
                    ? 'bg-[#D4AF37] border-[#D4AF37] text-black font-semibold'
                    : 'bg-gray-900 border-gray-800 text-white hover:border-[#D4AF37]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">⏳ Pendientes</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    filterStatus === 'pendientes' ? 'bg-black/15' : 'bg-black/20'
                  }`}>
                    {loadingCounts ? '...' : counts.pendientes}
                  </span>
                </div>
              </button>
            </div>
            {/* Info adicional */}
            <div className="mt-6 py-2 px-3 rounded-lg bg-gray-900/50 border border-gray-800">
              <p className="text-xs text-gray-400 leading-relaxed">
                Los shots aprobados aparecen en el muro principal. Los pendientes están en revisión por un administrador.
              </p>
            </div>
          </div>
        )}
        {rightPanel?.type === 'modal' && rightPanel.modal === 'auth' && !user && (
          <div className="mb-6 w-full max-w-md">
            <AuthModal onClose={handleClosePanel} embedded={true} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function MisShotsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Cargando...</div>}>
      <MisShotsContent />
    </Suspense>
  );
}