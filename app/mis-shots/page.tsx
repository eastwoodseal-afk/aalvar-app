// app/mis-shots/page.tsx

"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { canAccessSection } from '../../lib/roleUtils';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Masonry from 'react-masonry-css';

// Modal para ver el shot a tamaño normal en Mis Shots
function MisShotsDetailModal({ shot, onClose }: { shot: ShotData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white truncate">{shot.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-2 rounded-lg hover:bg-gray-700 transition-colors flex-shrink-0"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Imagen a tamaño normal */}
          <div className="mb-6 rounded-lg overflow-hidden bg-black flex items-center justify-center max-h-[60vh]">
            <img
              src={shot.image_url || "/placeholder.svg"}
              alt={shot.description}
              className="w-full h-auto object-contain"
            />
          </div>

          {/* Descripción */}
          {shot.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Descripción</h3>
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                {shot.description}
              </p>
            </div>
          )}

          {/* Info */}
          <div className="border-t border-gray-700 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {shot.is_approved ? (
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600/20">
                      <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-600/20">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">Estado</p>
                  <p className="text-sm text-gray-400">
                    {shot.is_approved ? "✓ Aprobado" : "⏳ Pendiente de aprobación"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">Creado</p>
                  <p className="text-sm text-gray-400">
                    {new Date(shot.created_at).toLocaleDateString("es-ES", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type ShotData = {
  id: number
  image_url: string
  title: string
  description: string
  user_id: string
  is_approved: boolean
  created_at: string
}

export default function MisShotsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [shots, setShots] = useState<ShotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShot, setSelectedShot] = useState<ShotData | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth');
        return;
      }
      
      if (!canAccessSection(user.role, 'my-shots')) {
        router.push('/');
        return;
      }
      
      fetchMyShots();
    }
  }, [user, authLoading, router]);

  const fetchMyShots = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('shots')
        .select('id, title, description, image_url, is_approved, created_at, user_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching my shots:', error);
        return;
      }

      setShots(data || []);
    } catch (error) {
      console.error('Error in fetchMyShots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShot = async (shotId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este shot?')) {
      return;
    }

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

      // Remove from local state
      setShots(prev => prev.filter(shot => shot.id !== shotId));
      alert('Shot eliminado correctamente');
    } catch (error) {
      console.error('Error deleting shot:', error);
      alert('Error al eliminar el shot');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  if (!canAccessSection(user.role, 'my-shots')) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">No tienes permisos para acceder a esta página</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <main className="container mx-auto p-4">
        {/* Hero */}
        <section className="max-w-4xl mx-auto text-center py-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Mis Shots</h1>
          <p className="text-gray-300 mb-6">Gestiona todos los shots que has creado. Los aprobados aparecerán en el muro principal.</p>
        </section>

        {/* Stats */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-2xl font-bold text-blue-400">{shots.length}</div>
            <div className="text-gray-400">Total de Shots</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-2xl font-bold text-green-400">
              {shots.filter(s => s.is_approved).length}
            </div>
            <div className="text-gray-400">Aprobados</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-2xl font-bold text-yellow-400">
              {shots.filter(s => !s.is_approved).length}
            </div>
            <div className="text-gray-400">Pendientes</div>
          </div>
        </div>

        {/* Masonry Grid */}
        {loading ? (
          <p className="text-center mt-8 text-gray-400">Cargando tus shots...</p>
        ) : shots.length === 0 ? (
          <div className="text-center mt-12">
            <p className="text-gray-400 text-lg mb-6">No has creado ningún shot aún.</p>
            <button
              onClick={() => router.push('/crear-shot')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-500 transition-colors"
            >
              ➕ Crear mi primer shot
            </button>
          </div>
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
              <div key={shot.id} className="break-inside-avoid mb-4 group cursor-pointer">
                <div className="relative overflow-hidden rounded-xl">
                  <img
                    src={shot.image_url || "/placeholder.svg"}
                    alt={shot.description}
                    className="w-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                    onClick={() => setSelectedShot(shot)}
                  />

                  {/* Delete button - small circle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteShot(shot.id);
                    }}
                    className="absolute top-2 right-2 p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all duration-300 opacity-0 group-hover:opacity-100"
                    title="Eliminar"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {/* Approval status badge */}
                  <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {shot.is_approved ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-600 text-white">
                        ✅ Aprobado
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-600 text-white">
                        ⏳ Pendiente
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2 text-sm leading-tight">
                  <p className="font-semibold text-white">{shot.title}</p>
                  <p className="text-gray-400 truncate">{shot.description}</p>
                </div>
              </div>
            ))}
          </Masonry>
        )}
      </main>

      {/* Modal para ver shot a tamaño normal */}
      {selectedShot && <MisShotsDetailModal shot={selectedShot} onClose={() => setSelectedShot(null)} />}

      <footer className="bg-gray-900 border-t border-gray-700 mt-8">
        <div className="p-4 text-center text-gray-400 text-sm">
          Footer
        </div>
      </footer>
    </div>
  );
}