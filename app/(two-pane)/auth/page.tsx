"use client";

import { useState } from "react";
import MasonryWall from "../../../components/MasonryWall";

// Reutiliza la lógica de la Home como children de /auth para habilitar el split en el lado izquierdo
export default function AuthChildrenPage() {
  const isLoggedIn = false;
  const savedShotIds = new Set<number>();

  // Estado para el shot seleccionado en el panel derecho (dentro del lado izquierdo)
  const [selectedShot, setSelectedShot] = useState<any>(null);

  if (selectedShot) {
    return (
      <>
        <div className="flex flex-col md:flex-row h-full">
          {/* Panel izquierdo: Muro */}
          <div className="md:w-[60%] overflow-y-auto bg-black scrollbar-hide border-r border-gray-900">
            <main className="px-4 py-4">
              <section className="max-w-7xl mx-auto text-center py-8 pl-15 pr-15">
                <div className="flex items-center justify-start gap-2 flex-nowrap">
                  <h1 className="text-lg font-bold text-white whitespace-nowrap">Inspírate. Guarda. Comparte.</h1>
                  <p className="text-sm text-gray-300">Explora una colección curada de ideas visuales, crea tus propios shots y guarda lo que más te guste.</p>
                </div>
              </section>
              <div className="pl-15 pr-15">
                <MasonryWall 
                  isLoggedIn={isLoggedIn} 
                  savedShotIds={savedShotIds}
                  onOpenShot={(shot) => setSelectedShot(shot)}
                />
              </div>
            </main>
          </div>

          {/* Panel derecho interno (del lado izquierdo): Detalle del shot */}
          <div className="md:w-[40%] bg-gray-950 overflow-y-auto p-6 scrollbar-hide">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">{selectedShot.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedShot(null)}
                  className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-100 text-sm"
                >
                  Cerrar
                </button>
              </div>

              {selectedShot.image_url && (
                <div className="w-full overflow-hidden rounded-lg border border-gray-900 bg-black">
                  <img
                    src={selectedShot.image_url}
                    alt={selectedShot.title}
                    className="w-full h-auto object-contain"
                    loading="lazy"
                  />
                </div>
              )}

              {selectedShot.description && (
                <p className="text-gray-300 whitespace-pre-wrap">{selectedShot.description}</p>
              )}

              <div className="text-xs text-gray-500">
                {selectedShot.created_at && (
                  <span>Publicado: {new Date(selectedShot.created_at).toLocaleString()}</span>
                )}
                {selectedShot.is_approved === false && (
                  <span className="ml-2 inline-block px-2 py-0.5 rounded bg-yellow-900/30 text-yellow-300">Pendiente</span>
                )}
              </div>
            </div>
          </div>
        </div>
        <style>{`.scrollbar-hide::-webkit-scrollbar{display:none;} .scrollbar-hide{scrollbar-width:none;}`}</style>
      </>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-black scrollbar-hide border-r border-gray-900">
      <main className="px-4 py-4">
        {/* Hero */}
        <section className="max-w-7xl mx-auto text-left py-8 pl-15 pr-15">
          <div className="flex items-center justify-start gap-2 flex-nowrap">
            <h1 className="text-lg font-bold text-white whitespace-nowrap">Inspírate. Guarda. Comparte.</h1>
            <p className="text-sm text-gray-300">Explora una colección curada de ideas visuales, crea tus propios shots y guarda lo que más te guste.</p>
          </div>
        </section>

        {/* Muro con onOpenShot para habilitar split */}
        <div className="pl-15 pr-15">
          <MasonryWall
            isLoggedIn={isLoggedIn}
            savedShotIds={savedShotIds}
            onOpenShot={(shot) => setSelectedShot(shot)}
          />
        </div>
      </main>

      {/* Ocultar scrollbars de forma sutil */}
      <style>{`.scrollbar-hide::-webkit-scrollbar{display:none;} .scrollbar-hide{scrollbar-width:none;}`}</style>
    </div>
  );
}
