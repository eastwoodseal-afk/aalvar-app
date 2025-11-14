// aalvar-app/app/page.tsx

"use client";

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import MasonryWall from '../components/MasonryWall';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

export default function HomePage() {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  
  // Nuevo estado para guardar los IDs de los shots guardados por el usuario
  const [savedShotIds, setSavedShotIds] = useState<Set<number>>(new Set());

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

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
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