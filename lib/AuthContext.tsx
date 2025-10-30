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

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
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