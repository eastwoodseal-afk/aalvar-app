"use client";

import { useEffect, useRef, useState } from 'react';

interface UsernameModalProps {
  isOpen: boolean;
  onSubmit: (username: string) => Promise<string | null>;
  onCancel?: () => void;
}

export default function UsernameModal({ isOpen, onSubmit, onCancel }: UsernameModalProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [liveValidation, setLiveValidation] = useState<{ valid: boolean; messages: string[] }>({ valid: true, messages: [] });
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setValue("");
      setError(null);
      setLoading(false);
      setLiveValidation({ valid: true, messages: [] });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateLive = (raw: string): { valid: boolean; messages: string[] } => {
    const val = raw.trim().toLowerCase();
    const messages: string[] = [];
    const re = /^[a-z0-9](?:[a-z0-9_.-]*[a-z0-9])?$/;
    const reserved = new Set([
      'admin','superadmin','root','support','help','api','auth','login','signup',
      'settings','profile','profiles','user','users','me','dashboard','admin-panel'
    ]);

    if (!val) {
      messages.push('✓ Ingresa al menos 3 caracteres');
    } else if (val.length < 3) {
      messages.push(`✗ Mínimo 3 caracteres (tienes ${val.length})`);
    } else if (val.length > 15) {
      messages.push(`✗ Máximo 15 caracteres (tienes ${val.length})`);
    } else {
      messages.push(`✓ Longitud correcta (${val.length} caracteres)`);
    }

    if (val && !re.test(val)) {
      messages.push('✗ Solo a-z, 0-9, _ . - (debe empezar y terminar con letra/número)');
    } else if (val && val.length >= 3) {
      messages.push('✓ Caracteres permitidos');
    }

    if (val && reserved.has(val)) {
      messages.push('✗ Nombre reservado');
    } else if (val && val.length >= 3) {
      messages.push('✓ No es reservado');
    }

    const valid = val.length >= 3 && val.length <= 15 && re.test(val) && !reserved.has(val);
    return { valid, messages };
  };

  const handleLocalValidation = (raw: string): string | null => {
    const val = raw.trim().toLowerCase();
    const re = /^[a-z0-9](?:[a-z0-9_.-]*[a-z0-9])?$/;
    const reserved = new Set([
      'admin','superadmin','root','support','help','api','auth','login','signup',
      'settings','profile','profiles','user','users','me','dashboard','admin-panel'
    ]);

    if (!val) return 'Ingresa un nombre de usuario';
    if (val.length < 3 || val.length > 15) return 'Debe tener entre 3 y 15 caracteres';
    if (!re.test(val)) return 'Sólo letras, números, _ . - y debe iniciar/terminar con letra o número';
    if (reserved.has(val)) return 'Ese nombre está reservado';
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setValue(newVal);
    if (error) setError(null);
    setLiveValidation(validateLive(newVal));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const localErr = handleLocalValidation(value);
    if (localErr) {
      setError(localErr);
      return;
    }
    setLoading(true);
    const serverErr = await onSubmit(value);
    setLoading(false);
    if (serverErr) {
      setError(serverErr);
    } else {
      // Success; modal will close from parent by isOpen=false
    }
  };

  const canSubmit = liveValidation.valid && !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Elige tu nombre de usuario</h2>
        <p className="mt-1 text-sm text-gray-600">
          Debe ser único (3-15 caracteres). Solo letras minúsculas, números, '_', '.', '-'.
        </p>
        
        {/* Leyenda informativa/advertencia */}
        <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 p-3">
          <div className="flex items-start gap-2">
            <svg className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-amber-800">
              <strong>Importante:</strong> Es necesario asignar un nombre de usuario para continuar. Si cancelas, se cerrará tu sesión.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
            <input
              id="username"
              ref={inputRef}
              value={value}
              onChange={handleChange}
              placeholder="tu_nombre"
              className={`mt-1 w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-1 ${
                value && !liveValidation.valid
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-black focus:ring-black'
              }`}
            />
            
            {/* Live validation hints */}
            {value && liveValidation.messages.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {liveValidation.messages.map((msg, i) => {
                  const isOk = msg.startsWith('✓');
                  return (
                    <li key={i} className={isOk ? 'text-green-600' : 'text-red-600'}>
                      {msg}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Server error (duplicado, etc) */}
            {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
