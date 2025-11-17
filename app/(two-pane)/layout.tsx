"use client";

import { ReactNode } from "react";
import Header from "../../components/Header";
import { usePathname } from "next/navigation";

export default function TwoPaneLayout({
  children,
  panel,
}: {
  children: ReactNode;
  panel: ReactNode;
}) {
  const pathname = usePathname();
  const rightPanelPaths = new Set(["/auth", "/crear-shot", "/shots-guardados", "/mis-shots"]);
  const hasPanel = rightPanelPaths.has(pathname);
  
  const leftWidth = !hasPanel ? 'md:w-full' : 'md:w-[70%]';
  const rightWidth = 'md:w-[30%]';
  
  return (
    <div className="min-h-screen bg-black">
      <Header />

      <div className="flex flex-col md:flex-row" style={{ height: "calc(100vh - 64px)" }}>
        {/* Panel izquierdo: contenido principal */}
        <div className={`${hasPanel ? `hidden md:block ${leftWidth} border-r border-gray-900` : leftWidth} flex-1 overflow-y-auto bg-black scrollbar-hide`}>
          {children}
        </div>

        {/* Panel derecho: slot auxiliar (@panel) */}
        {hasPanel && (
          <div className={`w-full ${rightWidth} bg-gray-950 overflow-y-auto p-4 scrollbar-hide`}>
            <div className="max-w-4xl mx-auto">
              {panel}
            </div>
          </div>
        )}
      </div>

      {/* Ocultar scrollbars de forma sutil */}
      <style>{`.scrollbar-hide::-webkit-scrollbar{display:none;} .scrollbar-hide{scrollbar-width:none;}`}</style>
    </div>
  );
}
