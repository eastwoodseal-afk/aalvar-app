// aalvar-app/app/page.tsx

"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import MasonryWall from '../../components/MasonryWall';
import CategoryFilter from '../../components/CategoryFilter';
import { getEnableCategoryFilter } from '../../lib/appSettings';
import { useAuth } from '../../lib/AuthContext';
import { useRightPanel } from '../../lib/RightPanelContext';
import { useSavedShotIds } from '../../lib/useSavedShotIds';
import { supabase } from '../../lib/supabase';
import { hasPermission } from '../../lib/roleUtils';

const CreateShotModal = dynamic(() => import('../../components/CreateShotModal'), { ssr: false });
const AuthModal = dynamic(() => import('../../components/AuthModal'), { ssr: false });

function HomePageContent() {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const rawCategoryParam = searchParams.get('categoria');
  const shotParam = searchParams.get('shot');
  const modalParam = searchParams.get('modal'); // 'crear-shot' o 'auth'
  const [categoryFilterEnabled, setCategoryFilterEnabled] = useState<boolean>(true);
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(false);
  const categoryFilter = categoryFilterEnabled && rawCategoryParam ? Number(rawCategoryParam) : undefined;
  
  // Reusable hook for saved shot IDs
  const { savedShotIds } = useSavedShotIds(user);
  
  // Control del panel derecho por contexto global
  const { rightPanel, setRightPanel } = useRightPanel();
  
  // Determinar si hay algo que mostrar en panel derecho
  const hasRightPanel = !!rightPanel;  

  // Cargar configuración (feature flag de categorías)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const enabled = await getEnableCategoryFilter();
      if (mounted) {
        setCategoryFilterEnabled(enabled);
        setSettingsLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Sincronizar query params con el contexto rightPanel
  useEffect(() => {
    if (shotParam) {
      // Si hay shot en la URL pero el panel no está mostrando ese shot, cargar el shot
      // (En un escenario real, aquí cargarías el shot desde la API)
      // Por ahora solo abrimos el panel si no está abierto
      if (!rightPanel || rightPanel.type !== 'shot') {
        // El shot se cargará cuando se haga click desde MasonryWall
        // Este efecto es para casos donde se comparte URL directa
      }
    } else if (modalParam && (modalParam === 'crear-shot' || modalParam === 'auth')) {
      // Si hay modal en la URL, sincronizar con el contexto
      if (!rightPanel || rightPanel.type !== 'modal' || rightPanel.modal !== modalParam) {
        setRightPanel({ type: 'modal', modal: modalParam as 'crear-shot' | 'auth' });
      }
    } else {
      // Si no hay ni shot ni modal en la URL, cerrar el panel
      if (rightPanel) {
        setRightPanel(null);
      }
    }
  }, [shotParam, modalParam]);

  const handleClosePanel = () => {
    setRightPanel(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('shot');
    params.delete('modal');
    router.push(`/?${params.toString()}`);
  };

  // Handler para abrir modal desde Header y cerrar shot
  const handleOpenModal = (modalType: 'crear-shot' | 'auth') => {
    setRightPanel({ type: 'modal', modal: modalType });
    const params = new URLSearchParams(searchParams.toString());
    params.delete('shot');
    params.set('modal', modalType);
    router.push(`/?${params.toString()}`);
  };
  // Layout persistente de dos paneles: panel derecho colapsado cuando no hay shot seleccionado
  return (
    <>
      <div className="flex flex-col md:flex-row" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Panel izquierdo: Muro (siempre visible) */}
        <div 
          className={`overflow-y-auto bg-black scrollbar-hide transition-all duration-300 ${
            hasRightPanel ? 'md:w-[60%] border-r border-gray-900' : 'w-full'
          }`}
        >
          <main className="px-4 py-4">
            <section className="max-w-7xl mx-auto text-center py-8 px-8">
              <div className="flex items-center justify-center gap-2 flex-nowrap">
                <h1 className="text-lg font-bold text-white whitespace-nowrap">
                  {searchQuery ? `Resultados para "${searchQuery}"` : 'Inspírate. Guarda. Comparte.'}
                </h1>
                {!searchQuery && (
                  <p className="text-sm text-gray-300">Explora una colección curada de ideas visuales, crea tus propios shots y guarda lo que más te guste.</p>
                )}
              </div>
            </section>
            
            {/* Filtro de Categorías (condicional) */}
            {settingsLoaded && categoryFilterEnabled && (
              <div className="max-w-7xl mx-auto px-4 mb-4">
                <CategoryFilter />
              </div>
            )}

            <MasonryWall 
              isLoggedIn={isLoggedIn} 
              savedShotIds={savedShotIds}
              searchQuery={searchQuery}
              categoryFilter={categoryFilter}
              onOpenShot={(shot) => {
                setRightPanel({ type: 'shot', shot });
                const params = new URLSearchParams(searchParams.toString());
                params.delete('modal');
                params.set('shot', String(shot.id));
                router.push(`/?${params.toString()}`);
              }}
            />
          </main>
        </div>
        
        {/* Panel derecho: Detalle shot / Modal crear / Modal auth (colapsado cuando no hay nada) */}
        <div 
          className={`bg-gray-950 overflow-y-auto scrollbar-hide transition-all duration-300 ${
            hasRightPanel ? 'md:w-[40%] p-6' : 'w-0 p-0 overflow-hidden'
          }`}
        >
          {rightPanel?.type === 'shot' && rightPanel.shot && (
            <ShotDetailPanel 
              shot={rightPanel.shot} 
              user={user} 
              onClose={handleClosePanel} 
            />
          )}

          {rightPanel?.type === 'modal' && rightPanel.modal === 'crear-shot' && user && (
            <CreateShotModal onClose={handleClosePanel} embedded={true} />
          )}

          {rightPanel?.type === 'modal' && rightPanel.modal === 'auth' && !user && (
            <div className="w-full max-w-md mx-auto relative">
              <button
                onClick={handleClosePanel}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-300 text-2xl font-bold z-10"
                title="Cerrar"
              >
                &times;
              </button>
              <div className="text-center mb-8 mt-8">
                <h1 className="text-3xl font-bold text-gray-100 mb-2">Esto es el inicio de tu inspiración visual</h1>
                <p className="text-gray-400">Crea, guarda y comparte ideas que te motivan.</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
                <AuthModal onClose={handleClosePanel} embedded={true} />
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`.scrollbar-hide::-webkit-scrollbar{display:none;} .scrollbar-hide{scrollbar-width:none;}`}</style>
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Cargando...</div>}>
      <HomePageContent />
    </Suspense>
  );
}

// Nuevo componente reutilizable para el panel de detalle
function ShotDetailPanel({ shot, user, onClose }: { shot: any, user: any, onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">{shot.title}</h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="px-2 py-1 rounded-md bg-[#B08A2E] hover:bg-[#A07C25] text-black text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] transition-colors"
        >
          ✕
        </button>
      </div>
      {shot.image_url && (
        <div className="w-full overflow-hidden rounded-lg border border-gray-900 bg-black relative">
          <img
            src={shot.image_url}
            alt={shot.title}
            className="w-full h-auto object-contain"
            loading="lazy"
          />
        </div>
      )}
      {shot.description && (
        <p className="text-gray-300 whitespace-pre-wrap">{shot.description}</p>
      )}
      <div className="text-xs text-gray-500">
        <span>Publicado: {new Date(shot.created_at).toLocaleString()}</span>
        {shot.is_approved === false && (
          <span className="ml-2 inline-block px-2 py-0.5 rounded bg-yellow-900/30 text-yellow-300">Pendiente</span>
        )}
      </div>
      {/* Mostrar argumento si el shot está desaprobado */}
      {shot.is_approved === false && shot.disapproval_reason && (
        <div className="mt-4 p-3 bg-red-900/30 rounded text-red-300 text-sm">
          <strong>Motivo de desaprobación:</strong> {shot.disapproval_reason}
        </div>
      )}
    </div>
  );
}