"use client";

import AuthModal from "../../../../components/AuthModal";

export default function AuthPanelPage() {
  // Panel derecho con el mismo wrapper visual que el split del home (título + botón cerrar)
  return (
    <div className="w-full max-w-md relative pl-15 pr-15">
      {/* Botón cerrar (X) arriba derecha */}
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
      {/* Contenedor del formulario */}
      <div className="bg-gray-900 rounded-lg p-6 shadow-lg">
        <AuthModal onClose={() => history.back()} embedded={true} />
      </div>
    </div>
  );
}
