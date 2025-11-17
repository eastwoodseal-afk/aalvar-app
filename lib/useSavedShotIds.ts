"use client";

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { UserWithRole } from './roleUtils';

/**
 * useSavedShotIds - Reusable hook to fetch and track a Set of shot IDs
 * the current authenticated user has saved.
 * Returns a Set<number> plus a loading boolean.
 */
export function useSavedShotIds(user: UserWithRole | null) {
  const [savedShotIds, setSavedShotIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let canceled = false;
    const fetchSaved = async () => {
      if (!user) { setSavedShotIds(new Set()); return; }
      setLoading(true);
      const { data, error } = await supabase
        .from('saved_shots')
        .select('shot_id')
        .eq('user_id', user.id);
      if (!canceled) {
        if (!error && data) {
          setSavedShotIds(new Set(data.map(d => d.shot_id)));
        } else {
          setSavedShotIds(new Set());
        }
        setLoading(false);
      }
    };
    fetchSaved();
    return () => { canceled = true; };
  }, [user]);

  return { savedShotIds, loading };
}
