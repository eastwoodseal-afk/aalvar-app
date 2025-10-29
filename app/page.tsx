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
        {/* Le pasamos la lista de IDs guardados al muro */}
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