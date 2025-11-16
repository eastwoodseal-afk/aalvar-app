// aalvar-app/app/page.tsx

"use client";

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { useRouter } from 'next/navigation';
import MasonryWall from '../components/MasonryWall';
import AuthModal from '../components/AuthModal';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

export default function HomePage() {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  
  // Nuevo estado para guardar los IDs de los shots guardados por el usuario
  const [savedShotIds, setSavedShotIds] = useState<Set<number>>(new Set());
  
  // Estado para controlar si se muestra el split screen de login
  const [showLoginSplit, setShowLoginSplit] = useState(false);

  // useEffect para cargar los shots guardados cuando el usuario cambia
  useEffect(() => {
    if (isLoggedIn) {
      const fetchSavedShots = async () => {
        const { data, error } = await supabase
          .from('saved_shots')
          .select('shot_id')
          .eq('user_id', user.id); // Solo para el usuario logueado

        if (error) {
          console.error("Error fetching saved shots:", error);
          return;
        }

        console.log("Shots guardados obtenidos de Supabase:", data);

        
        // Convertimos el array de objetos a un Set de IDs para búsquedas rápidas
        const ids = new Set(data.map(item => item.shot_id));
        setSavedShotIds(ids);
      };

      fetchSavedShots();
    } else {
      // Si no hay usuario, limpiamos la lista
      setSavedShotIds(new Set());
    }
  }, [isLoggedIn, user]); // Se ejecuta si el estado de login o el usuario cambia

  // Cerrar split screen cuando el usuario inicie sesión
  useEffect(() => {
    if (isLoggedIn) {
      setShowLoginSplit(false);
    }
  }, [isLoggedIn]);

  // Si el usuario solicita el split de login (sin estar logueado)
  const router = useRouter();
  if (!isLoggedIn && showLoginSplit) {
    const handleLogoClick = () => {
      setShowLoginSplit(false);
      router.push('/');
    };
    return (
      <div className="min-h-screen bg-black">
        <Header onLogoClick={handleLogoClick} onLoginClick={() => setShowLoginSplit(true)} />
        <div className="flex flex-col md:flex-row" style={{ height: 'calc(100vh - 64px)' }}>
          {/* Panel izquierdo: Muro de shots (preview) */}
          <div className="hidden md:block md:w-[70%] overflow-y-auto bg-black scrollbar-hide border-r border-gray-900">
            <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-gray-900 p-4">
              <p className="text-gray-500 text-sm text-center">Vista previa del muro · Inicia sesión para interactuar</p>
            </div>
            <div className="container mx-auto p-4">
              <MasonryWall isLoggedIn={false} savedShotIds={new Set()} />
            </div>
          </div>

          {/* Panel derecho: Formulario de autenticación */}
          <div className="w-full md:w-[30%] bg-gray-950 overflow-y-auto flex items-center justify-center p-4 relative">
            <div className="w-full max-w-md relative">
              {/* Botón cerrar (X) arriba derecha */}
              <button
                onClick={() => setShowLoginSplit(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-300 text-2xl font-bold z-10"
                title="Cerrar"
              >
                &times;
              </button>
              <div className="text-center mb-8 mt-8">
                <h1 className="text-3xl font-bold text-gray-100 mb-2">Esto es el inicio de tu inspiración visual</h1>
                <p className="text-gray-400">Crea, guarda y comparte ideas que te motivan.</p>
              </div>
              {/* Contenedor del formulario */}
              <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
                <AuthModal onClose={() => setShowLoginSplit(false)} embedded={true} />
              </div>
            </div>
          </div>
        </div>
        {/* Hide scrollbar utility */}
        <style>{`.scrollbar-hide::-webkit-scrollbar{display:none;} .scrollbar-hide{scrollbar-width:none;}`}</style>
      </div>
    );
  }

  // Usuario logueado O usuario no logueado sin split: vista normal con header y muro completo
  const handleLogoClick = () => {
    setShowLoginSplit(false);
    router.push('/');
  };
  return (
    <div className="min-h-screen bg-black">
      <Header onLogoClick={handleLogoClick} onLoginClick={() => setShowLoginSplit(true)} />
      
      <main className="container mx-auto p-4">
        {/* Hero */}
        <section className="max-w-4xl mx-auto text-center py-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Inspírate. Guarda. Comparte.</h1>
          <p className="text-gray-300 mb-6">Explora una colección curada de ideas visuales, crea tus propios shots y guarda lo que más te guste.</p>
          {/* CTAs removidos: el muro principal es la misma página; y 'Guardados' requiere sesión */}
        </section>

        {/* 
         * MasonryWall en el muro principal solo necesita:
         * - isLoggedIn: determina si se muestra el botón de guardar en cada shot
         * - savedShotIds: marca los shots que el usuario ya guardó (Set de IDs)
         * 
         * No necesita otras props porque:
         * - No es modo admin (isAdminMode): el muro principal solo muestra shots aprobados
         * - No filtra por usuario (userFilter): muestra shots de todos los usuarios
         * - No filtra guardados (showOnlySaved): muestra todos los shots aprobados
         * - No usa callbacks de aprobación (onApprove/onReject): solo el panel admin los usa
         */}
        <MasonryWall isLoggedIn={isLoggedIn} savedShotIds={savedShotIds} />
      </main>

      <footer className="bg-gray-900 border-t border-gray-700 mt-8">
        <div className="p-4 text-center text-gray-400 text-sm">
          Footer
        </div>
      </footer>
    </div>
  );
}