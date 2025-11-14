// lib/AuthContext.tsx

"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { UserRole, UserWithRole } from './roleUtils';

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

  const fetchUserWithRole = async (authUser: User): Promise<UserWithRole | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, role, created_at, promoted_by, promoted_at')
        .eq('id', authUser.id)
        .single();

      // If profile missing, try to create it using metadata or a pending username stored locally
      if (error || !data) {
        console.warn('Profile not found for auth user, attempting to create profile', { authUser, error });

        // Determine username: prefer auth user metadata, then pending localStorage value, then email prefix
        let usernameCandidate: string | null = null;
        try {
          // user_metadata may contain username if passed during signUp
          // @ts-ignore
          usernameCandidate = authUser?.user_metadata?.username || null;
        } catch (e) {
          usernameCandidate = null;
        }

        try {
          const pending = localStorage.getItem('pending_username');
          if (!usernameCandidate && pending) usernameCandidate = pending;
        } catch (e) {
          // ignore localStorage errors
        }

        if (!usernameCandidate && authUser.email) {
          usernameCandidate = authUser.email.split('@')[0];
        }

        const insertData: any = {
          id: authUser.id,
          username: usernameCandidate || `user_${Math.random().toString(36).slice(2,8)}`,
          role: 'subscriber',
          created_at: new Date().toISOString(),
        };

        const { data: inserted, error: insertError } = await supabase.from('profiles').insert(insertData).select().single();
        try { localStorage.removeItem('pending_username'); } catch (e) {}

        if (insertError) {
          console.error('Error creating profile for auth user:', insertError);
          return null;
        }

        // Use the newly inserted profile
        const created = inserted;
        const userWithRole: UserWithRole = {
          id: created.id,
          email: authUser.email || '',
          username: created.username,
          role: created.role || 'subscriber',
          created_at: created.created_at,
          promoted_by: created.promoted_by,
          promoted_at: created.promoted_at,
        };
        return userWithRole;
      }
      // If profile exists but username is empty, prompt the user AFTER sign-in to choose one (only once)
      try {
        if (!data.username || data.username === '') {
          // Prompt user to enter a username (loop until unique or user cancels)
          let chosen: string | null = null;
          try { chosen = localStorage.getItem('pending_username'); } catch (e) { chosen = null; }

          // If no pending username, prompt now
          if (!chosen) {
            chosen = window.prompt('Por favor asigna un nombre de usuario para tu cuenta:') || null;
          }

          while (chosen) {
            // validate uniqueness
            const { data: existing, error: existErr } = await supabase.from('profiles').select('id').eq('username', chosen).limit(1);
            if (existErr) {
              console.error('Error checking username uniqueness post-OAuth', existErr);
              break;
            }

            if (existing && (existing as any).length > 0) {
              // already exists
              chosen = window.prompt('El nombre de usuario ya existe. Ingresa otro nombre de usuario:') || null;
              continue;
            }

            // unique -> update profile
            const { error: updErr } = await supabase.from('profiles').update({ username: chosen }).eq('id', authUser.id);
            try { localStorage.removeItem('pending_username'); } catch (e) {}
            if (updErr) {
              console.error('Error updating profile username post-OAuth', updErr);
            } else {
              data.username = chosen; // reflect the update locally
            }
            break;
          }
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