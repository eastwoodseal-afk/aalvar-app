"use client";

import { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { updateEmail, updatePassword, validateEmail, validatePassword } from '../../lib/profile/profileUtils';

export default function ProfileSecurity() {
  const { user } = useAuth();
  
  // Email state
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailSuccess(false);
    
    const validation = validateEmail(value);
    setEmailError(validation.valid ? '' : validation.error || '');
  };

  const handleSaveEmail = async () => {
    const validation = validateEmail(email);
    if (!validation.valid) {
      setEmailError(validation.error || '');
      return;
    }

    setIsSavingEmail(true);
    const result = await updateEmail(email);
    setIsSavingEmail(false);

    if (result.success) {
      setEmailSuccess(true);
      setEmailError('');
      setEmail('');
      setTimeout(() => setEmailSuccess(false), 5000);
    } else {
      setEmailError(result.error || 'Error al actualizar email');
    }
  };

  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
    setPasswordSuccess(false);
    
    const validation = validatePassword(value);
    setPasswordError(validation.valid ? '' : validation.error || '');
  };

  const handleSavePassword = async () => {
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setPasswordError(validation.error || '');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    setIsSavingPassword(true);
    const result = await updatePassword(newPassword);
    setIsSavingPassword(false);

    if (result.success) {
      setPasswordSuccess(true);
      setPasswordError('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 5000);
    } else {
      setPasswordError(result.error || 'Error al actualizar contraseña');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-2">🔒 Seguridad de la Cuenta</h3>
        <p className="text-gray-400 text-sm">Gestiona tu email y contraseña</p>
      </div>

      {/* Cambiar Email */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="mb-4">
          <label className="block text-white font-medium mb-2">Cambiar Email</label>
          <p className="text-gray-400 text-sm mb-3">
            Recibirás un email de confirmación en la nueva dirección.
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
              emailError 
                ? 'border-red-500 focus:ring-red-500' 
                : emailSuccess
                ? 'border-green-500 focus:ring-green-500'
                : 'border-gray-600 focus:ring-[#D4AF37]'
            }`}
            placeholder="nuevo_email@ejemplo.com"
            disabled={isSavingEmail}
          />

          {emailError && (
            <p className="text-red-400 text-sm flex items-center gap-2">
              <span>⚠️</span>
              {emailError}
            </p>
          )}

          {emailSuccess && (
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-3">
              <p className="text-green-400 text-sm flex items-center gap-2">
                <span>✓</span>
                Email actualizado. Revisa tu bandeja de entrada para confirmar.
              </p>
            </div>
          )}

          <button
            onClick={handleSaveEmail}
            disabled={isSavingEmail || !!emailError || !email}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSavingEmail ? 'Actualizando...' : 'Actualizar Email'}
          </button>
        </div>
      </div>

      {/* Cambiar Contraseña */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="mb-4">
          <label className="block text-white font-medium mb-2">Cambiar Contraseña</label>
          <p className="text-gray-400 text-sm mb-3">
            Mínimo 6 caracteres. Se cerrará tu sesión automáticamente.
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => handlePasswordChange(e.target.value)}
              className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                passwordError 
                  ? 'border-red-500 focus:ring-red-500' 
                  : passwordSuccess
                  ? 'border-green-500 focus:ring-green-500'
                  : 'border-gray-600 focus:ring-[#D4AF37]'
              }`}
              placeholder="Nueva contraseña"
              disabled={isSavingPassword}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>

          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`w-full px-4 py-3 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
              passwordError 
                ? 'border-red-500 focus:ring-red-500' 
                : passwordSuccess
                ? 'border-green-500 focus:ring-green-500'
                : 'border-gray-600 focus:ring-[#D4AF37]'
            }`}
            placeholder="Confirmar nueva contraseña"
            disabled={isSavingPassword}
          />

          {passwordError && (
            <p className="text-red-400 text-sm flex items-center gap-2">
              <span>⚠️</span>
              {passwordError}
            </p>
          )}

          {passwordSuccess && (
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-3">
              <p className="text-green-400 text-sm flex items-center gap-2">
                <span>✓</span>
                Contraseña actualizada correctamente
              </p>
            </div>
          )}

          <button
            onClick={handleSavePassword}
            disabled={isSavingPassword || !!passwordError || !newPassword || !confirmPassword}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSavingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
          </button>
        </div>
      </div>
    </div>
  );
}
