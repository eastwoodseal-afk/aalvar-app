// app/crear-shot/page.tsx

"use client";

import { useAuth } from '../../lib/AuthContext';
import { canAccessSection } from '../../lib/roleUtils';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import CreateShotModal from '../../components/CreateShotModal';
import AuthModal from '../../components/AuthModal';
import Header from '../../components/Header';

export default function CrearShotPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      if (!canAccessSection(user.role, 'create-shots')) {
        router.push('/');
      }
    }
  }, [user, authLoading, router]);

  const handleCloseModal = () => {
    router.push('/'); // Redirect to main wall after closing
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  // Si NO hay usuario: mostrar split con formulario de autenticación incrustado a la derecha
  if (!user) {
    return (
      <div className="min-h-screen bg-black">
        <Header onLogoClick={() => router.push('/')} />
        <div className="flex flex-col md:flex-row" style={{ height: 'calc(100vh - 64px)' }}>
          <div className="hidden md:block md:w-[70%] bg-black border-r border-gray-900" />
          <div className="w-full md:w-[30%] bg-gray-950 overflow-y-auto p-4 scrollbar-hide">
            <div className="max-w-xl mx-auto">
              <AuthModal onClose={() => router.push('/')} embedded={true} />
            </div>
          </div>
        </div>
        <style>{`.scrollbar-hide::-webkit-scrollbar{display:none;} .scrollbar-hide{scrollbar-width:none;}`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Header onLogoClick={() => router.push('/')} />
      <div className="flex flex-col md:flex-row" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Panel izquierdo: espacio visual oscuro minimalista */}
        <div className="hidden md:block md:w-[70%] bg-black border-r border-gray-900" />
        {/* Panel derecho: formulario embebido */}
        <div className="w-full md:w-[30%] bg-gray-950 overflow-y-auto p-4 scrollbar-hide">
          <div className="max-w-xl mx-auto">
            <CreateShotModal onClose={handleCloseModal} embedded={true} />
          </div>
        </div>
      </div>
      <style>{`.scrollbar-hide::-webkit-scrollbar{display:none;} .scrollbar-hide{scrollbar-width:none;}`}</style>
    </div>
  );
}