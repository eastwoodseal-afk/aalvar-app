// app/shots-guardados/page.tsx

"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { canAccessSection } from '../../lib/roleUtils';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import ShotModal from '../../components/ShotModal';
import Masonry from 'react-masonry-css';

interface ShotData {
  id: number;
  image_url: string;
  title: string;
  description: string;
  user_id: string;
  is_approved: boolean;
  created_at: string;
}

interface SavedShot {
  id: string;
  shot_id: string;
  created_at: string;
  shots: ShotData[];
}

export default function ShotsGuardadosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [savedShots, setSavedShots] = useState<SavedShot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShot, setSelectedShot] = useState<ShotData | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth');
        return;
      }
      
  if (!canAccessSection(user.role, 'shots-guardados')) {
        router.push('/');
        return;
      }
      
      fetchSavedShots();
    }
  }, [user, authLoading, router]);

  const fetchSavedShots = async () => {
    if (!user) return;

    try {
      // Primero: obtener los IDs de los shots guardados
      // Nota: saved_shots no tiene columna 'id', usa clave compuesta (user_id, shot_id)
      const { data: savedData, error: savedError } = await supabase
        .from('saved_shots')
        .select('shot_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (savedError) {
        console.error('Error fetching saved shot IDs:', savedError);
        return;
      }

      console.log('Saved shot IDs:', savedData);

      if (!savedData || savedData.length === 0) {
        setSavedShots([]);
        setLoading(false);
        return;
      }

      // Segundo: obtener los datos de los shots usando los IDs
      const shotIds = savedData.map(s => s.shot_id);
      const { data: shotsData, error: shotsError } = await supabase
        .from('shots')
        .select('id, title, description, image_url, user_id, is_approved, created_at')
        .in('id', shotIds);

      if (shotsError) {
        console.error('Error fetching shots:', shotsError);
        return;
      }

      console.log('Shots data:', shotsData);

      // Tercero: combinar los datos
      // Usamos shot_id como id para la clave del mapa porque saved_shots no tiene 'id'
      const combined = savedData.map(saved => {
        const shot = shotsData?.find(s => s.id === saved.shot_id);
        return {
          id: `saved_${saved.shot_id}`, // Generar un ID único basado en shot_id
          shot_id: saved.shot_id,
          created_at: saved.created_at,
          shots: shot ? [shot] : []
        };
      }).filter(item => item.shots.length > 0); // Filtrar si el shot no existe

      console.log('Combined data:', combined);
      setSavedShots(combined);
    } catch (error) {
      console.error('Error in fetchSavedShots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsaveShot = async (savedShotId: string) => {
    try {
      // savedShotId es "saved_<shot_id>", extraer el shot_id
      const actualShotId = parseInt(savedShotId.replace('saved_', ''), 10);
      
      const { error } = await supabase
        .from('saved_shots')
        .delete()
        .eq('shot_id', actualShotId)
        .eq('user_id', user?.id); // Extra security check

      if (error) {
        console.error('Error unsaving shot:', error);
        alert('Error al quitar de guardados');
        return;
      }

      // Remove from local state
      setSavedShots(prev => prev.filter(saved => saved.id !== savedShotId));
    } catch (error) {
      console.error('Error unsaving shot:', error);
      alert('Error al quitar de guardados');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  if (!canAccessSection(user.role, 'shots-guardados')) {
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
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Shots Guardados</h1>
          <p className="text-gray-300 mb-6">Todos los shots que has guardado para ver más tarde.</p>
        </section>

        {/* Stats */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-2xl font-bold text-blue-400">{savedShots.length}</div>
            <div className="text-gray-400">Shots Guardados</div>
          </div>
        </div>

        {/* Masonry Grid */}
        {loading ? (
          <p className="text-center mt-8 text-gray-400">Cargando tus shots guardados...</p>
        ) : savedShots.length === 0 ? (
          <div className="text-center mt-12">
            <p className="text-gray-400 text-lg mb-6">No has guardado ningún shot aún.</p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-500 transition-colors"
            >
              ➕ Explorar Muro Principal
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
            {savedShots.map((savedShot) => {
              // Verificar que shots array existe y tiene datos
              if (!savedShot.shots || savedShot.shots.length === 0) {
                return null;
              }
              
              return (
              <div key={savedShot.id} className="break-inside-avoid mb-4 group cursor-pointer">
                <div className="relative overflow-hidden rounded-xl">
                  <img
                    src={savedShot.shots[0].image_url || "/placeholder.svg"}
                    alt={savedShot.shots[0].description}
                    className="w-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                    loading="lazy"
                    decoding="async"
                    onClick={() => setSelectedShot(savedShot.shots[0])}
                  />

                  {/* Unsave button - small circle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnsaveShot(savedShot.id);
                    }}
                    className="absolute top-2 right-2 p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all duration-300 opacity-0 group-hover:opacity-100"
                    title="Quitar de guardados"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {/* Saved badge */}
                  <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                      💾 Guardado
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-sm leading-tight">
                  <p className="font-semibold text-white">{savedShot.shots[0].title}</p>
                  <p className="text-gray-400 truncate">{savedShot.shots[0].description}</p>
                </div>
              </div>
              );
            })}
          </Masonry>
        )}
      </main>

      {/* ShotModal para ver shot a tamaño original */}
      {selectedShot && <ShotModal shotData={selectedShot} onClose={() => setSelectedShot(null)} showDelete={false} />}

      <footer className="bg-gray-900 border-t border-gray-700 mt-8">
        <div className="p-4 text-center text-gray-400 text-sm">
          Footer
        </div>
      </footer>
    </div>
  );
}