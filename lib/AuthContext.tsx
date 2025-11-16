// lib/AuthContext.tsx

"use client";

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { UserRole, UserWithRole } from './roleUtils';
import UsernameModal from '@/components/UsernameModal';

interface AuthContextType {
  user: UserWithRole | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [pendingUserIdForUsername, setPendingUserIdForUsername] = useState<string | null>(null);

  const fetchUserWithRole = async (authUser: User): Promise<UserWithRole | null> => {
    try {
      // Try to fetch profile; if not found, wait briefly and retry because DB trigger creates it on signup
      let data: any = null;
      let error: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await supabase
          .from('profiles')
          .select('id, username, role, created_at, promoted_by, promoted_at')
          .eq('id', authUser.id)
          .maybeSingle();
        data = res.data;
        error = res.error;
        if (data && !error) break;
        await new Promise((r) => setTimeout(r, 300));
      }

      // If still missing, return null (will retry on next auth state change)
      if (error || !data) {
        console.warn('Profile not found for auth user after retries', { authUser, error });
        return null;
      }
      // If profile exists but username is empty, prompt the user AFTER sign-in to choose one (only once)
      try {
        if (!data.username || data.username === '') {
          setPendingUserIdForUsername(authUser.id);
          setShowUsernameModal(true);
        }
      } catch (e) {
        console.warn('Error handling missing username after OAuth:', e);
      }

      // Create UserWithRole object with email from auth user
      const userWithRole: UserWithRole = {
        id: data.id,
        email: authUser.email || '',
        username: data.username,
        role: data.role || 'subscriber',
        created_at: data.created_at,
        promoted_by: data.promoted_by,
        promoted_at: data.promoted_at,
      };

      return userWithRole;
    } catch (error) {
      console.error('Error in fetchUserWithRole:', error);
      return null;
    }
  };

  // Handle modal submission for username selection
  const handleUsernameSubmit = async (rawInput: string): Promise<string | null> => {
    const normalize = (s: string) => s.trim().toLowerCase();
    const username = normalize(rawInput);
    const re = /^[a-z0-9](?:[a-z0-9_.-]*[a-z0-9])?$/;
    const reserved = new Set([
      'admin','superadmin','root','support','help','api','auth','login','signup',
      'settings','profile','profiles','user','users','me','dashboard','admin-panel'
    ]);

    if (!username) return 'Ingresa un nombre de usuario';
    if (username.length < 3 || username.length > 15) return 'Debe tener entre 3 y 15 caracteres';
    if (!re.test(username)) return 'Sólo letras, números, _ . - y debe iniciar/terminar con letra o número';
    if (reserved.has(username)) return 'Ese nombre está reservado';

    if (!pendingUserIdForUsername) return 'No hay usuario autenticado para actualizar';

    // Try to update directly; rely on DB unique index to detect duplicados
    const { error: updErr } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', pendingUserIdForUsername);

    if (updErr) {
      // Unique violation code in Postgres: 23505
      const code = (updErr as any).code || (updErr as any).details || '';
      if (String(code).includes('23505') || (updErr as any).message?.toLowerCase().includes('duplicate')) {
        return 'Ese nombre ya está en uso';
      }
      console.error('Error actualizando username:', updErr);
      return 'Error guardando el nombre de usuario';
    }

    // Refresh local state
    await refreshUserRole();
    setShowUsernameModal(false);
    setPendingUserIdForUsername(null);
    try { localStorage.removeItem('pending_username'); } catch {}
    return null;
  };

  const refreshUserRole = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const userWithRole = await fetchUserWithRole(authUser);
      setUser(userWithRole);
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const userWithRole = await fetchUserWithRole(session.user);
        setUser(userWithRole);
      }
      
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const userWithRole = await fetchUserWithRole(session.user);
          setUser(userWithRole);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        }
      }
    });

    if (error) throw error;

    // The profile will be created automatically by the database trigger
    // But we can update the role if it's the superadmin
    if (data.user && email === 'eastwood.seal@gmail.com') {
      // Wait a bit for the trigger to create the profile
      setTimeout(async () => {
        await supabase
          .from('profiles')
          .update({ 
            role: 'superadmin',
            promoted_by: data.user!.id,
            promoted_at: new Date().toISOString()
          })
          .eq('id', data.user!.id);

        // Log the initial setup
        await supabase
          .from('role_promotions')
          .insert({
            user_id: data.user!.id,
            promoted_by: data.user!.id,
            old_role: 'subscriber',
            new_role: 'superadmin',
            notes: 'Initial superadmin setup',
            created_at: new Date().toISOString(),
          });
      }, 2000);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    refreshUserRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <UsernameModal
        isOpen={showUsernameModal}
        onSubmit={handleUsernameSubmit}
        onCancel={async () => {
          // Cancelar cierra sesión (policy: no se puede continuar sin username)
          try {
            await supabase.auth.signOut();
          } finally {
            setShowUsernameModal(false);
            setPendingUserIdForUsername(null);
            setUser(null);
          }
        }}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}