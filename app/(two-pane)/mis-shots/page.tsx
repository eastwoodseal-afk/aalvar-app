"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useAuth } from '../../../lib/AuthContext';
import { supabase } from '../../../lib/supabase';
import { canAccessSection } from '../../../lib/roleUtils';
import { useRouter, useSearchParams } from 'next/navigation';
import Masonry from 'react-masonry-css';

type ShotData = {
  id: number;
  image_url: string;
  title: string;
  description?: string;
  user_id?: string;
  is_approved: boolean;
  created_at?: string;
};

function MisShotsContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterStatus = searchParams.get('estado'); // 'aprobados', 'pendientes', null
  const [shots, setShots] = useState<ShotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);
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
        .select('id, title, image_url, is_approved, created_at, description')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Aplicar filtro por estado si existe
      if (filterStatus === 'aprobados') {
        query = query.eq('is_approved', true);
      } else if (filterStatus === 'pendientes') {
        query = query.eq('is_approved', false);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching my shots:', error);
        setHasMore(false);
        return;
      }

      const batch = data || [];
      setShots(prev => pageIndex === 0 ? batch : [...prev, ...batch]);
      setHasMore(batch.length === PAGE_SIZE);
      setPage(pageIndex + 1);
    } catch (e) {
      console.error('Error in fetchPage(my-shots):', e);
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
    fetchFirstPage();
  }, [authLoading, user, router, filterStatus]);

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

  const handleShotClick = (shotId: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('shot', shotId.toString());
    router.push(`/mis-shots?${params.toString()}`);
  };

  if (authLoading || !user) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Cargando...</div>;
  }
  if (!canAccessSection(user.role, 'my-shots')) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">No tienes permisos para acceder a esta página</div>;
  }

  return (
    <div className="min-h-screen bg-black">
      <main className="container mx-auto p-4 relative">
        {/* Indicadores circulares en esquina superior derecha */}
        <div className="absolute top-8 right-0 flex flex-col gap-2 z-10">
          <div className="relative group">
            <div className="w-10 h-10 rounded-full bg-gray-800 border border-[#D4AF37] flex items-center justify-center text-white text-sm font-semibold">
              {shots.length}
            </div>
            <div className="absolute right-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-gray-800/95 backdrop-blur px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Shots Visibles
            </div>
          </div>
        </div>

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
        ) : shots.length === 0 ? (
          <div className="text-center mt-12">
            <p className="text-gray-400 text-lg mb-6">
              {filterStatus ? 'No hay shots en esta categoría.' : 'No has creado ningún shot aún.'}
            </p>
            <button onClick={() => router.push('/crear-shot')} className="bg-[#D4AF37] text-black px-6 py-2 rounded-md hover:brightness-110 transition-all font-semibold">➕ Crear mi primer shot</button>
          </div>
        ) : (
          <div className="pl-15 pr-15">
            <Masonry breakpointCols={{ default: 6, 1280: 6, 1024: 6, 768: 4, 640: 3 }} className="flex w-auto -ml-4" columnClassName="pl-4 bg-clip-padding">
              {shots.map((shot) => (
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
                    {/* Estado visual por contorno: verde aprobado, dorado pendiente */}
                  </div>
                  <div className="mt-2 text-sm leading-tight"><p className="font-semibold text-white">{shot.title}</p><p className="text-gray-400 truncate">{shot.description}</p></div>
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
  );
}

export default function MisShotsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Cargando...</div>}>
      <MisShotsContent />
    </Suspense>
  );
}
