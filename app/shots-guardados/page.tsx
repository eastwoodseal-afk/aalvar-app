// app/shots-guardados/page.tsx

"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { canAccessSection } from '../../lib/roleUtils';
import { useRouter } from 'next/navigation';

interface SavedShot {
  id: string;
  shot_id: string;
  created_at: string;
  shots: {
    id: string;
    title: string;
    description: string;
    image_url: string;
    created_at: string;
    users: {
      email: string;
    };
  };
}

export default function ShotsGuardadosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [savedShots, setSavedShots] = useState<SavedShot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth');
        return;
      }
      
      if (!canAccessSection(user.role, 'saved-shots')) {
        router.push('/');
        return;
      }
      
      fetchSavedShots();
    }
  }, [user, authLoading, router]);

  const fetchSavedShots = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('saved_shots')
        .select(`
          id,
          shot_id,
          created_at,
          shots (
            id,
            title,
            description,
            image_url,
            created_at,
            users (
              email
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved shots:', error);
        return;
      }

      setSavedShots(data || []);
    } catch (error) {
      console.error('Error in fetchSavedShots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsaveShot = async (savedShotId: string) => {
    try {
      const { error } = await supabase
        .from('saved_shots')
        .delete()
        .eq('id', savedShotId)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  if (!canAccessSection(user.role, 'saved-shots')) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">No tienes permisos para acceder a esta página</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Shots Guardados</h1>
          <p className="text-gray-400 mt-2">
            Todos los shots que has guardado para ver más tarde
          </p>
        </div>

        {/* Stats */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8">
          <div className="text-2xl font-bold text-blue-400">{savedShots.length}</div>
          <div className="text-gray-400">Shots Guardados</div>
        </div>

        {/* Saved Shots Grid */}
        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-400">Cargando shots guardados...</div>
          </div>
        ) : savedShots.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              No has guardado ningún shot aún
            </div>
            <p className="text-gray-500 text-sm mb-6">
              Explora el muro principal y guarda los shots que más te gusten
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Explorar Muro Principal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedShots.map((savedShot) => (
              <div key={savedShot.id} className="bg-gray-900 rounded-lg overflow-hidden">
                <img
                  src={savedShot.shots.image_url}
                  alt={savedShot.shots.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{savedShot.shots.title}</h3>
                  <p className="text-gray-400 text-sm mb-3">{savedShot.shots.description}</p>
                  <div className="text-xs text-gray-500 mb-2">
                    Por: {savedShot.shots.users.email}
                  </div>
                  <div className="text-xs text-gray-500 mb-4">
                    Guardado: {formatDate(savedShot.created_at)}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => window.open(savedShot.shots.image_url, '_blank')}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      👁️ Ver
                    </button>
                    <button
                      onClick={() => handleUnsaveShot(savedShot.id)}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
                    >
                      💾❌ Quitar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}