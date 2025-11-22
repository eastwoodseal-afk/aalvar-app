// lib/profile/profileUtils.ts
// Utilidades independientes para el módulo de perfil de usuario

import { supabase } from '../supabase';

export interface UserStats {
  totalShots: number;
  approvedShots: number;
  pendingShots: number;
  rejectedShots: number;
  savedShots: number;
  totalBoards: number;
  accountAge: string;
  joinDate: string;
}

/**
 * Obtiene todas las estadísticas del usuario de forma independiente
 */
export async function getUserStats(userId: string): Promise<UserStats | null> {
  try {
    // Shots creados por el usuario
    const { data: shots, error: shotsError } = await supabase
      .from('shots')
      .select('id, is_approved, created_at')
      .eq('user_id', userId);

    if (shotsError) throw shotsError;

    const totalShots = shots?.length || 0;
    const approvedShots = shots?.filter(s => s.is_approved === true).length || 0;
    const pendingShots = shots?.filter(s => s.is_approved === false || s.is_approved === null).length || 0;
    const rejectedShots = totalShots - approvedShots - pendingShots;

    // Shots guardados
    const { count: savedCount, error: savedError } = await supabase
      .from('saved_shots')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (savedError) throw savedError;

    // Tableros creados
    const { count: boardsCount, error: boardsError } = await supabase
      .from('boards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (boardsError) throw boardsError;

    // Fecha de registro
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    const joinDate = profile?.created_at || new Date().toISOString();
    const accountAge = calculateAccountAge(joinDate);

    return {
      totalShots,
      approvedShots,
      pendingShots,
      rejectedShots,
      savedShots: savedCount || 0,
      totalBoards: boardsCount || 0,
      accountAge,
      joinDate,
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
}

/**
 * Calcula la antigüedad de la cuenta en formato legible
 */
function calculateAccountAge(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return 'Hoy';
  if (diffDays === 1) return '1 día';
  if (diffDays < 30) return `${diffDays} días`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 mes';
  if (diffMonths < 12) return `${diffMonths} meses`;
  
  const diffYears = Math.floor(diffMonths / 12);
  return diffYears === 1 ? '1 año' : `${diffYears} años`;
}

/**
 * Valida username (solo alfanumérico, guiones y guiones bajos, 3-20 caracteres)
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || username.trim().length === 0) {
    return { valid: false, error: 'El nombre de usuario es requerido' };
  }
  
  if (username.length < 3) {
    return { valid: false, error: 'Mínimo 3 caracteres' };
  }
  
  if (username.length > 20) {
    return { valid: false, error: 'Máximo 20 caracteres' };
  }
  
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return { valid: false, error: 'Solo letras, números, guiones y guiones bajos' };
  }
  
  return { valid: true };
}

/**
 * Valida email
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: 'El email es requerido' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Email inválido' };
  }
  
  return { valid: true };
}

/**
 * Valida password
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length === 0) {
    return { valid: false, error: 'La contraseña es requerida' };
  }
  
  if (password.length < 6) {
    return { valid: false, error: 'Mínimo 6 caracteres' };
  }
  
  return { valid: true };
}

/**
 * Actualiza el username del usuario
 */
export async function updateUsername(userId: string, newUsername: string): Promise<{ success: boolean; error?: string }> {
  try {
    const validation = validateUsername(newUsername);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Verificar si el username ya existe
    const { data: existing, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', newUsername)
      .neq('id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existing) {
      return { success: false, error: 'Este nombre de usuario ya está en uso' };
    }

    // Actualizar username
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: newUsername })
      .eq('id', userId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error) {
    console.error('Error updating username:', error);
    return { success: false, error: 'Error al actualizar el nombre de usuario' };
  }
}

/**
 * Actualiza el email del usuario
 */
export async function updateEmail(newEmail: string): Promise<{ success: boolean; error?: string }> {
  try {
    const validation = validateEmail(newEmail);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const { error } = await supabase.auth.updateUser({ email: newEmail });
    
    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error updating email:', error);
    return { success: false, error: error?.message || 'Error al actualizar el email' };
  }
}

/**
 * Actualiza el password del usuario
 */
export async function updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error updating password:', error);
    return { success: false, error: error?.message || 'Error al actualizar la contraseña' };
  }
}

/**
 * Elimina la cuenta del usuario (soft delete)
 */
export async function deleteUserAccount(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Mantener shots aprobados en el muro; solo marcarlos como inactivos
    await supabase
      .from('shots')
      .update({ is_active: false })
      .eq('user_id', userId);

    // Eliminar saved_shots
    await supabase
      .from('saved_shots')
      .delete()
      .eq('user_id', userId);

    // Eliminar boards
    await supabase
      .from('boards')
      .delete()
      .eq('user_id', userId);

    // Marcar perfil como inactivo
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        username: `deleted_${userId.substring(0, 8)}`,
        role: 'subscriber',
      })
      .eq('id', userId);

    if (profileError) throw profileError;

    // Sign out
    await supabase.auth.signOut();

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting account:', error);
    return { success: false, error: error?.message || 'Error al eliminar la cuenta' };
  }
}
