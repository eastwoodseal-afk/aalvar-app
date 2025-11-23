// aalvar-app/components/AuthModal.tsx
"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export default function AuthModal({ onClose, embedded = false }: { onClose: () => void; embedded?: boolean }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const { user, refreshUserRole } = useAuth();

  // Validación en tiempo real del username
  const validateUsername = (val: string): string | null => {
    const normalized = val.trim().toLowerCase();
    const re = /^[a-z0-9](?:[a-z0-9_.-]*[a-z0-9])?$/;
    const reserved = new Set([
      'admin','superadmin','root','support','help','api','auth','login','signup',
      'settings','profile','profiles','user','users','me','dashboard','admin-panel'
    ]);

    if (!normalized) return 'Ingresa un nombre de usuario';
    if (normalized.length < 3 || normalized.length > 15) return 'Debe tener entre 3 y 15 caracteres';
    if (!re.test(normalized)) return 'Sólo letras, números, _ . - (debe empezar y terminar con letra/número)';
    if (reserved.has(normalized)) return 'Ese nombre está reservado';
    return null;
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUsername(val);
    if (val) {
      setUsernameError(validateUsername(val));
    } else {
      setUsernameError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUsernameError(null);

    try {
      if (isSignUp) {
        // Validar formato del username
        const usernameValidationError = validateUsername(username);
        if (usernameValidationError) {
          setUsernameError(usernameValidationError);
          setLoading(false);
          return;
        }

        // Normalizar username (lowercase + trim)
        const normalizedUsername = username.trim().toLowerCase();

        // Comprobar que el username no exista ya
        const { data: existingUsers, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', normalizedUsername)
          .limit(1);

        if (checkError) {
          console.error('Error checking username uniqueness:', checkError);
          throw new Error('Error verificando disponibilidad del nombre de usuario');
        }

        if (existingUsers && existingUsers.length > 0) {
          setUsernameError('Ese nombre de usuario ya está en uso');
          setLoading(false);
          return;
        }

        // Crear usuario pasando username como metadata
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: normalizedUsername,
            }
          }
        });

        if (signUpError) throw signUpError;

        alert('¡Registro exitoso! Por favor, revisa tu email para confirmar tu cuenta.');
      } else {
        // --- Lógica de INICIO DE SESIÓN (sin cambios) ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        await refreshUserRole();
        alert('¡Has iniciado sesión!');
      }
      
      // Si todo fue bien, cerramos el modal
      onClose();
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Eliminado: lógica de restauración de sesión Google OAuth
  useEffect(() => {
    // Cierra el modal automáticamente si el usuario está autenticado
    console.log('AuthModal user:', user);
    if (user) {
      onClose();
    }
  }, [user]);

  return (
    <div className={embedded ? "" : "fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"}>
      <div className={embedded ? "w-full" : "bg-white rounded-lg max-w-md w-full p-6"}>
        {!embedded && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{isSignUp ? 'Crea tu cuenta' : 'Inicia sesión'}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
          </div>
        )}

        {embedded && (
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-center">{isSignUp ? 'Crea tu cuenta' : 'Inicia sesión'}</h2>
          </div>
        )}

        
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Nombre de Usuario <span className="text-red-500">*</span>
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  required
                  placeholder="tu_nombre"
                  className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 ${
                    usernameError
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-[#D4AF37] focus:border-[#D4AF37]'
                  }`}
                />
                {usernameError && (
                  <p className="mt-1 text-xs text-red-600">{usernameError}</p>
                )}
                {!usernameError && username && (
                  <p className="mt-1 text-xs text-green-600">✓ Nombre válido</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  3-15 caracteres: a-z, 0-9, _ . - (minúsculas)
                </p>
              </div>
            )}
              {error && (
                <div className="mt-2 text-xs text-red-500 text-center">{error}</div>
              )}
    
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37]"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37]"
            />
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Cargando...' : (isSignUp ? 'Registrarse' : 'Iniciar Sesión')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[#D4AF37] hover:underline text-sm"
          >
            {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </div>

        {/* Eliminado: botón y lógica de Google OAuth */}
      </div>
    </div>
  );
}
