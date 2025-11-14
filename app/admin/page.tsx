// app/admin/page.tsx

"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { hasPermission, UserRole } from '../../lib/roleUtils';
import UserSearch from '../../components/UserSearch';
import RoleManager from '../../components/RoleManager';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import MasonryWall from '../../components/MasonryWall';
import AdminShotModal from '../../components/AdminShotModal';

interface Shot {
  id: string;
  title: string;
  description: string;
  image_url: string;
  user_id: string;
  is_approved: boolean;
  created_at: string;
  profiles: {
    username: string;
  }[] | null;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'shots' | 'promote-members' | 'promote-admins' | 'manage-admins'>('shots');
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth');
        return;
      }
      
      if (!hasPermission(user.role, 'canAccessAdmin')) {
        router.push('/');
        return;
      }
      
      fetchPendingShots();
    }
  }, [user, authLoading, router]);

  const fetchPendingShots = async () => {
    try {
      console.log('fetchPendingShots: current user (from context):', user);

      // Also check Supabase client session (may provide extra clues)
      try {
        const authRes = await supabase.auth.getUser();
        console.log('fetchPendingShots: supabase.auth.getUser():', authRes);
      } catch (authErr) {
        console.warn('fetchPendingShots: supabase.auth.getUser() failed:', authErr);
      }

      // Execute the query and capture the full result object for richer logging
      const result: any = await supabase
        .from('shots')
        .select(`
          id,
          title,
          description,
          image_url,
          user_id,
          is_approved,
          created_at,
          profiles!shots_user_id_fkey (
            username
          )
        `)
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      const { data, error, status } = result || {};

      if (error || !data) {
        // Log everything we got from Supabase so we can debug opaque `{}` errors
        try {
          console.error('Error fetching shots: full result ->', {
            status,
            error,
            data,
            keys: data ? Object.keys(data) : undefined,
            typeofError: typeof error,
            errorMessage: (error as any)?.message,
            errorDetails: (error as any)?.details,
            errorHint: (error as any)?.hint,
            stringified: (() => {
              try {
                return JSON.stringify({ status, error, data }, null, 2);
              } catch (e) {
                return 'Could not stringify result';
              }
            })(),
          });

          // Extra low-level inspection: log raw result and its property names
          try {
            console.log('fetchPendingShots: raw result object:', result);
            console.log('fetchPendingShots: result constructor name:', result?.constructor?.name);
            console.log('fetchPendingShots: own property names:', Object.getOwnPropertyNames(result || {}));
            console.log('fetchPendingShots: own property descriptors:', Object.getOwnPropertyDescriptors(result || {}));
          } catch (inspectErr) {
            console.warn('fetchPendingShots: failed low-level inspection:', inspectErr);
          }
        } catch (logErr) {
          console.error('Error fetching shots (and failed to stringify result):', result, logErr);
        }

        if (!Array.isArray(data)) return;
      }

      setShots(data || []);
    } catch (error) {
      console.error('Error in fetchPendingShots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveShot = async (shotId: string) => {
    try {
      const { error } = await supabase
        .from('shots')
        .update({ is_approved: true })
        .eq('id', shotId);

      if (error) {
        console.error('Error approving shot:', error);
        return;
      }

  // Remove from pending list
  setShots(prev => prev.filter(shot => shot.id !== shotId));

      // Send notification to shot creator
      const shot = shots.find(s => s.id === shotId);
      if (shot) {
        await supabase
          .from('notifications')
          .insert({
            user_id: shot.user_id,
            title: 'Shot Aprobado',
            message: `Tu shot "${shot.title}" ha sido aprobado y ahora es visible en el muro principal.`,
            type: 'shot_approved',
            read: false,
            created_at: new Date().toISOString(),
          });
      }

      alert('Shot aprobado correctamente');
    } catch (error) {
      console.error('Error approving shot:', error);
      alert('Error al aprobar el shot');
    }
  };

  const handleRejectShot = async (shotId: string) => {
    if (!confirm('¿Estás seguro de que quieres rechazar este shot? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('shots')
        .delete()
        .eq('id', shotId);

      if (error) {
        console.error('Error rejecting shot:', error);
        return;
      }

      // Remove from pending list
      setShots(prev => prev.filter(shot => shot.id !== shotId));
      alert('Shot rechazado correctamente');
    } catch (error) {
      console.error('Error rejecting shot:', error);
      alert('Error al rechazar el shot');
    }
  };

  const openAdminModal = (shot: Shot | any) => {
    setSelectedShot(shot)
    setIsModalOpen(true)
  }

  const closeAdminModal = () => {
    setSelectedShot(null)
    setIsModalOpen(false)
  }

  const handlePromoteUser = async (userId: string, newRole: UserRole) => {
    if (!user) return;

    try {
      console.log('handlePromoteUser: starting promotion', { userId, newRole, currentUserRole: user.role });

      // Get current user for logging
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('handlePromoteUser: error getting current user from auth', authError);
        alert('Error obteniendo tu usuario actual');
        return { success: false };
      }
      if (!currentUser) {
        console.error('handlePromoteUser: no current user in auth');
        alert('No se pudo obtener el usuario actual');
        return { success: false };
      }
      console.log('handlePromoteUser: current user from auth', { id: currentUser.id, email: currentUser.email });

      // Get the user being promoted
      console.log('handlePromoteUser: fetching target user', { userId });
      const { data: targetUser, error: fetchError } = await supabase
        .from('profiles')
        .select('username, role')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('handlePromoteUser: error fetching target user', fetchError);
        alert(`Error: No se pudo obtener el perfil del usuario. ${(fetchError as any)?.message || ''}`);
        return { success: false };
      }
      if (!targetUser) {
        console.error('handlePromoteUser: target user not found');
        alert('Error: Usuario no encontrado');
        return { success: false };
      }
      console.log('handlePromoteUser: target user fetched', { username: targetUser.username, role: targetUser.role });

      // Update user role
      const updateData: any = { 
        role: newRole,
        promoted_by: currentUser.id,
        promoted_at: new Date().toISOString()
      };
      console.log('handlePromoteUser: attempting role update', { userId, updateData });

      const { error: updateError, data: updateData_result } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (updateError) {
        console.error('handlePromoteUser: error updating user role in profiles', { error: updateError, code: (updateError as any)?.code, message: (updateError as any)?.message });
        alert(`Error al actualizar el rol: ${(updateError as any)?.message || 'Error desconocido'}`);
        return { success: false };
      }
      console.log('handlePromoteUser: role update succeeded', { updateData_result });

      // Log the promotion
      console.log('handlePromoteUser: inserting into role_promotions');
      const { error: promError } = await supabase
        .from('role_promotions')
        .insert({
          user_id: userId,
          promoted_by: currentUser.id,
          old_role: targetUser.role || 'subscriber',
          new_role: newRole,
          notes: `Promoted by ${user.role}`,
          created_at: new Date().toISOString(),
        });

      if (promError) {
        console.error('handlePromoteUser: error inserting role_promotions', promError);
      } else {
        console.log('handlePromoteUser: role_promotions insertion succeeded');
      }

      // Send notification to promoted user
      console.log('handlePromoteUser: inserting notification');
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: '🎉 ¡Promoción de Rol!',
          message: `¡Felicidades! Has sido promovido a ${newRole === 'member' ? 'Usuario Miembro' : 'Usuario Administrador'}. Ahora tienes acceso a nuevas funciones.`,
          type: 'role_promotion',
          read: false,
          created_at: new Date().toISOString(),
        });

      if (notifError) {
        console.error('handlePromoteUser: error inserting notification', notifError);
      } else {
        console.log('handlePromoteUser: notification insertion succeeded');
      }

      console.log('handlePromoteUser: promotion complete, showing success alert');
      alert(`Usuario promovido a ${newRole === 'member' ? 'Miembro' : 'Administrador'} correctamente`);
      return { success: true, newRole };
    } catch (error) {
      console.error('handlePromoteUser: unexpected error', error);
      alert(`Error inesperado: ${(error as any)?.message || 'Desconocido'}`);
      return { success: false };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  if (!hasPermission(user.role, 'canAccessAdmin')) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">No tienes permisos para acceder a esta página</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
  <Header />
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <p className="text-gray-400 mt-2">
            Gestiona shots, usuarios y permisos del sistema
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('shots')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'shots'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Shots Pendientes ({shots.length})
            </button>
            
            {hasPermission(user.role, 'canManageUsers') && (
              <button
                onClick={() => setActiveTab('promote-members')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'promote-members'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Promover a Miembros
              </button>
            )}

            {user.role === 'superadmin' && (
              <>
                <button
                  onClick={() => setActiveTab('promote-admins')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'promote-admins'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Promover a Admins
                </button>
                
                <button
                  onClick={() => setActiveTab('manage-admins')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'manage-admins'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Gestionar Admins
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'shots' && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Shots Pendientes de Aprobación</h2>

            {/* Use the MasonryWall in admin mode. It will render Shot cards and show admin controls.
                We pass our approve/reject handlers and a custom onOpenShot to show the admin modal */}
            <MasonryWall
              isLoggedIn={!!user}
              savedShotIds={new Set<number>()}
              isAdminMode={true}
              onApprove={(id: number) => handleApproveShot(String(id))}
              onReject={(id: number) => handleRejectShot(String(id))}
              onOpenShot={(shot) => openAdminModal(shot)}
            />

            {isModalOpen && selectedShot && (
              <AdminShotModal
                shotData={selectedShot}
                onClose={closeAdminModal}
                onApprove={(id) => handleApproveShot(String(id))}
                onReject={(id) => handleRejectShot(String(id))}
              />
            )}
          </div>
        )}

        {activeTab === 'promote-members' && hasPermission(user.role, 'canManageUsers') && (
          <UserSearch
            searchRole="subscriber"
            targetRole="member"
            onPromote={handlePromoteUser}
            title="Promover Suscriptores a Miembros"
            description="Busca usuarios suscriptores y promuévelos a miembros para que puedan crear shots."
          />
        )}

        {activeTab === 'promote-admins' && user.role === 'superadmin' && (
          <UserSearch
            searchRole="member"
            targetRole="admin"
            onPromote={handlePromoteUser}
            title="Promover Miembros a Administradores"
            description="Busca usuarios miembros y promuévelos a administradores para que puedan gestionar el sistema."
          />
        )}

        {activeTab === 'manage-admins' && user.role === 'superadmin' && (
          <RoleManager currentRole={user.role} />
        )}
      </div>
    </div>
  );
}