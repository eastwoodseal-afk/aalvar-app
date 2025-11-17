"use client";

import { useEffect } from "react";
import { useAuth } from "../../../../lib/AuthContext";
import { canAccessSection } from "../../../../lib/roleUtils";
import CreateShotModal from "../../../../components/CreateShotModal";
import AuthModal from "../../../../components/AuthModal";

export default function CrearShotPanelPage() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    // Si no hay usuario, mostrar el panel de Auth en el mismo slot, con wrapper (título + X)
    return (
      <div className="w-full max-w-md relative">
        <button
          onClick={() => history.back()}
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
          <AuthModal onClose={() => history.back()} embedded={true} />
        </div>
      </div>
    );
  }

  if (!canAccessSection(user.role, 'create-shots')) {
    return (
      <div className="text-gray-300 text-sm bg-gray-900 rounded-lg p-4">
        No tienes permisos para crear shots.
      </div>
    );
  }

  return <CreateShotModal onClose={() => history.back()} embedded={true} />;
}
