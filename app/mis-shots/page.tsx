// app/mis-shots/page.tsx

"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { canAccessSection } from '../../lib/roleUtils';
import { useRouter } from 'next/navigation';

interface Shot {
  id: string;
  title: string;
  description: string;
  image_url: string;
  approved: boolean;
  created_at: string;
}

export default function MisShotsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');

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
        .select('id, title, description, image_url, is_approved, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching my shots:', error);
        return;
      }

  // Normalize Supabase field `is_approved` to our local `approved` property
  setShots((data || []).map((d: any) => ({ ...d, approved: d.is_approved })));
    } catch (error) {
      console.error('Error in fetchMyShots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShot = async (shotId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este shot? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('shots')
        .delete()
        .eq('id', shotId)
        .eq('user_id', user?.id); // Extra security check

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

  const filteredShots = shots.filter(shot => {
    if (filter === 'approved') return shot.approved;
    if (filter === 'pending') return !shot.approved;
    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (approved: boolean) => {
    if (approved) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✅ Aprobado
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          ⏳ Pendiente
        </span>
      );
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
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Mis Shots</h1>
          <p className="text-gray-400 mt-2">
            Gestiona todos los shots que has creado
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-2xl font-bold text-blue-400">{shots.length}</div>
            <div className="text-gray-400">Total de Shots</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-2xl font-bold text-green-400">
              {shots.filter(s => s.approved).length}
            </div>
            <div className="text-gray-400">Shots Aprobados</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="text-2xl font-bold text-yellow-400">
              {shots.filter(s => !s.approved).length}
            </div>
            <div className="text-gray-400">Shots Pendientes</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Todos ({shots.length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'approved'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Aprobados ({shots.filter(s => s.approved).length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Pendientes ({shots.filter(s => !s.approved).length})
            </button>
          </div>
        </div>

        {/* Shots Grid */}
        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-400">Cargando tus shots...</div>
          </div>
        ) : filteredShots.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              {filter === 'all' 
                ? 'No has creado ningún shot aún'
                : `No tienes shots ${filter === 'approved' ? 'aprobados' : 'pendientes'}`
              }
            </div>
            {filter === 'all' && (
              <button
                onClick={() => router.push('/crear-shot')}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Crear mi primer shot
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShots.map((shot) => (
              <div key={shot.id} className="bg-gray-900 rounded-lg overflow-hidden">
                <img
                  src={shot.image_url}
                  alt={shot.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{shot.title}</h3>
                    {getStatusBadge(shot.approved)}
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{shot.description}</p>
                  <div className="text-xs text-gray-500 mb-4">
                    Creado: {formatDate(shot.created_at)}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDeleteShot(shot.id)}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
                    >
                      🗑️ Eliminar
                    </button>
                    {shot.approved && (
                      <button
                        onClick={() => window.open(shot.image_url, '_blank')}
                        className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
                      >
                        👁️ Ver
                      </button>
                    )}
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