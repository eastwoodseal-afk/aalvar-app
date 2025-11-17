"use client";

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '../../../../lib/AuthContext';
import { supabase } from '../../../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

function MisShotsPanelContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterStatus = searchParams.get('estado'); // null, 'aprobados', 'pendientes'
  const selectedShotId = searchParams.get('shot');
  const [shotDetail, setShotDetail] = useState<any>(null);
  const [loadingShot, setLoadingShot] = useState(false);
  const [counts, setCounts] = useState({ total: 0, aprobados: 0, pendientes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchCounts = async () => {
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
        setLoading(false);
      }
    };

    fetchCounts();
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

  const handleFilterClick = (filter: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === null) {
      params.delete('estado');
    } else {
      params.set('estado', filter);
    }
    const qs = params.toString();
    router.push(qs ? `/mis-shots?${qs}` : '/mis-shots');
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-950 p-6 scrollbar-hide relative flex flex-col items-end">
      {/* Si hay un shot seleccionado, mostrar detalle */}
      {shotDetail ? (
        <div className="space-y-4 w-full max-w-md">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{shotDetail.title}</h2>
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete('shot');
                router.push(`/mis-shots?${params.toString()}`);
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

          <div className="text-xs text-gray-500 space-y-2">
            {shotDetail.created_at && (
              <div>
                <span>Publicado: {new Date(shotDetail.created_at).toLocaleString()}</span>
              </div>
            )}
            <div>
              <span className={`inline-block px-2 py-0.5 rounded ${
                shotDetail.is_approved 
                  ? 'bg-green-900/30 text-green-300' 
                  : 'bg-yellow-900/30 text-yellow-300'
              }`}>
                {shotDetail.is_approved ? '✅ Aprobado' : '⏳ Pendiente de aprobación'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        // Vista normal: filtros por estado
        <div className="space-y-4 w-full max-w-md">
          {/* Header */}
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
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/20">
                {loading ? '...' : counts.total}
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
                <span className="text-xs px-2 py-0.5 rounded-full bg-black/20">
                  {loading ? '...' : counts.aprobados}
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
                <span className="text-xs px-2 py-0.5 rounded-full bg-black/20">
                  {loading ? '...' : counts.pendientes}
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

      <style>{`
        .scrollbar-hide::-webkit-scrollbar{display:none;} 
        .scrollbar-hide{scrollbar-width:none;}
      `}</style>
    </div>
  );
}

export default function MisShotsPanel() {
  return (
    <Suspense fallback={<div className="h-full bg-gray-950 p-6 flex items-center justify-center text-gray-400">Cargando...</div>}>
      <MisShotsPanelContent />
    </Suspense>
  );
}
