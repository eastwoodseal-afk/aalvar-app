"use client";

import { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { useRouter } from 'next/navigation';
import { deleteUserAccount } from '../../lib/profile/profileUtils';

export default function ProfileDangerZone() {
  const { user } = useAuth();
  const router = useRouter();
  const [confirmUsername, setConfirmUsername] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    if (confirmUsername !== user.username) {
      setError('El nombre de usuario no coincide');
      return;
    }

    setIsDeleting(true);
    setError('');

    const result = await deleteUserAccount(user.id);

    if (result.success) {
      // Redirigir a home después de eliminar
      router.push('/');
    } else {
      setIsDeleting(false);
      setError(result.error || 'Error al eliminar la cuenta');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-900/20 to-gray-800 rounded-lg p-6 border-2 border-red-500/50">
        <h3 className="text-xl font-bold text-red-400 mb-2">🗑️ Zona de Peligro</h3>
        <p className="text-gray-400 text-sm">Acciones irreversibles. Procede con precaución.</p>
      </div>

      {/* Información sobre la eliminación */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h4 className="text-white font-semibold mb-3">¿Qué sucede al eliminar tu cuenta?</h4>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5">•</span>
            <span>Tus shots serán marcados como inactivos y no aparecerán en el muro</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5">•</span>
            <span>Se eliminarán todos tus shots guardados y tableros</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5">•</span>
            <span>Tu perfil será desactivado permanentemente</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5">•</span>
            <span>Esta acción <strong className="text-white">NO se puede deshacer</strong></span>
          </li>
        </ul>
      </div>

      {/* Botón para mostrar confirmación */}
      {!showConfirmation ? (
        <button
          onClick={() => setShowConfirmation(true)}
          className="w-full bg-red-600/20 border-2 border-red-500 text-red-400 py-4 rounded-lg font-semibold hover:bg-red-600/30 transition-all"
        >
          Eliminar Mi Cuenta Permanentemente
        </button>
      ) : (
        <div className="bg-red-900/20 border-2 border-red-500 rounded-lg p-6 space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h4 className="text-white font-bold text-lg mb-2">Confirmación Final</h4>
            <p className="text-gray-400 text-sm mb-4">
              Esta acción es permanente e irreversible. Para confirmar, escribe tu nombre de usuario exacto:
            </p>
            <p className="text-[#D4AF37] font-mono text-lg mb-4">@{user?.username}</p>
          </div>

          <input
            type="text"
            value={confirmUsername}
            onChange={(e) => {
              setConfirmUsername(e.target.value);
              setError('');
            }}
            className={`w-full px-4 py-3 bg-gray-900 border-2 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
              error ? 'border-red-500 focus:ring-red-500' : 'border-red-600 focus:ring-red-500'
            }`}
            placeholder="Escribe tu nombre de usuario"
            disabled={isDeleting}
          />

          {error && (
            <p className="text-red-400 text-sm flex items-center gap-2">
              <span>⚠️</span>
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowConfirmation(false);
                setConfirmUsername('');
                setError('');
              }}
              disabled={isDeleting}
              className="flex-1 bg-gray-700 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 disabled:opacity-50 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={isDeleting || confirmUsername !== user?.username}
              className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Cuenta'}
            </button>
          </div>
        </div>
      )}

      {/* Alternativas */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 border-dashed">
        <p className="text-gray-400 text-sm text-center">
          ¿No estás seguro? Puedes simplemente cerrar sesión o contactar al soporte si tienes algún problema.
        </p>
      </div>
    </div>
  );
}
