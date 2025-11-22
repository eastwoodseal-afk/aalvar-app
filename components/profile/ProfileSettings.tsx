"use client";

import { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { updateUsername, validateUsername } from '../../lib/profile/profileUtils';

export default function ProfileSettings() {
  const { user } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [usernameError, setUsernameError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setSaveSuccess(false);
    
    const validation = validateUsername(value);
    setUsernameError(validation.valid ? '' : validation.error || '');
  };

  const handleSaveUsername = async () => {
    if (!user?.id) return;
    
    const validation = validateUsername(username);
    if (!validation.valid) {
      setUsernameError(validation.error || '');
      return;
    }

    if (username === user.username) {
      setUsernameError('Este ya es tu nombre de usuario actual');
      return;
    }

    setIsSaving(true);
    const result = await updateUsername(user.id, username);
    setIsSaving(false);

    if (result.success) {
      setSaveSuccess(true);
      setUsernameError('');
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setUsernameError(result.error || 'Error al guardar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-2">⚙️ Configuración de Perfil</h3>
        <p className="text-gray-400 text-sm">Personaliza tu perfil y preferencias</p>
      </div>

      {/* Username */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="mb-4">
          <label className="block text-white font-medium mb-2">Nombre de Usuario</label>
          <p className="text-gray-400 text-sm mb-3">
            Tu identificador único en la plataforma. Solo letras, números, guiones y guiones bajos.
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              className={`w-full pl-9 pr-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                usernameError 
                  ? 'border-red-500 focus:ring-red-500' 
                  : saveSuccess
                  ? 'border-green-500 focus:ring-green-500'
                  : 'border-gray-600 focus:ring-[#D4AF37]'
              }`}
              placeholder="tu_nombre_de_usuario"
              maxLength={20}
              disabled={isSaving}
            />
          </div>

          {usernameError && (
            <p className="text-red-400 text-sm flex items-center gap-2">
              <span>⚠️</span>
              {usernameError}
            </p>
          )}

          {saveSuccess && (
            <p className="text-green-400 text-sm flex items-center gap-2">
              <span>✓</span>
              Nombre de usuario actualizado correctamente
            </p>
          )}

          <button
            onClick={handleSaveUsername}
            disabled={isSaving || !!usernameError || username === user?.username}
            className="w-full bg-[#D4AF37] text-black py-3 rounded-lg font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Info adicional - Placeholder para futuras features */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 border-dashed">
        <div className="text-center text-gray-500">
          <p className="text-sm">🚧 Más opciones de personalización próximamente</p>
          <p className="text-xs mt-1">(Avatar, bio, preferencias, etc.)</p>
        </div>
      </div>
    </div>
  );
}
