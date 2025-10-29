// app/crear-shot/page.tsx

"use client";

import { useAuth } from '../../lib/AuthContext';
import { canAccessSection } from '../../lib/roleUtils';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CreateShotModal from '../../components/CreateShotModal';

export default function CrearShotPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth');
        return;
      }
      
      if (!canAccessSection(user.role, 'create-shots')) {
        router.push('/');
        return;
      }
      
      // Show modal immediately when page loads
      setShowModal(true);
    }
  }, [user, authLoading, router]);

  const handleCloseModal = () => {
    setShowModal(false);
    router.push('/'); // Redirect to main wall after closing
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  if (!canAccessSection(user.role, 'create-shots')) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">No tienes permisos para acceder a esta página</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {showModal && (
        <CreateShotModal onClose={handleCloseModal} />
      )}
      
      {/* Background content when modal is not shown */}
      {!showModal && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-4">Crear Shot</h1>
            <p className="text-gray-400 mb-6">
              Comparte tus mejores imágenes con la comunidad
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              ➕ Crear Nuevo Shot
            </button>
          </div>
        </div>
      )}
    </div>
  );
}