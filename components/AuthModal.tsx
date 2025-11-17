// aalvar-app/components/AuthModal.tsx
"use client";

import { useState } from 'react';
import { supabase } from '../lib/supabase'; // <-- AÑADE ESTA LÍNEA

export default function AuthModal({ onClose, embedded = false }: { onClose: () => void; embedded?: boolean }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

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
      }

      
      else {
        // --- Lógica de INICIO DE SESIÓN (sin cambios) ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
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

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">O</span>
            </div>
          </div>

          <button onClick={async () => {
              // Start OAuth flow with Google without requiring username beforehand.
              try {
                const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
                if (error) {
                  console.error('Google sign-in error', error);
                  setError((error as any)?.message || 'Error iniciando sesión con Google');
                  return;
                }
                if (data?.url) {
                  window.location.href = data.url;
                }
              } catch (err) {
                console.error('Google sign-in unexpected error', err);
                setError((err as any)?.message || 'Error iniciando sesión con Google');
              }
            }} className="mt-4 w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>
        </div>
      </div>
    </div>
  );
}
