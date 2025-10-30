// app/admin/page.tsx

"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { hasPermission, UserRole } from '../../lib/roleUtils';
import UserSearch from '../../components/UserSearch';
import RoleManager from '../../components/RoleManager';
import { useRouter } from 'next/navigation';

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
  } | null;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'shots' | 'promote-members' | 'promote-admins' | 'manage-admins'>('shots');

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
      const { data, error } = await supabase
        .from('shots')
        .select(`
          id,
          title,
          description,
          image_url,
          user_id,
          is_approved,
          created_at,
          profiles (
            username
          )
        `)
        .eq('is_approved', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching shots:', error);
        return;
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

  const handlePromoteUser = async (userId: string, newRole: UserRole) => {
    if (!user) return;

    try {
      // Get current user for logging
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Get the user being promoted
      const { data: targetUser, error: fetchError } = await supabase
        .from('profiles')
        .select('username, role')
        .eq('id', userId)
        .single();

      if (fetchError) {
        console.error('Error fetching target user:', fetchError);
        return;
      }

      // Update user role
      const updateData: any = { 
        role: newRole,
        promoted_by: currentUser.id,
        promoted_at: new Date().toISOString()
      };

      // If promoting to admin, also set is_admin flag
      if (newRole === 'admin') {
        updateData.is_admin = true;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user role:', updateError);
        return;
      }

      // Log the promotion
      await supabase
        .from('role_promotions')
        .insert({
          user_id: userId,
          promoted_by: currentUser.id,
          old_role: targetUser.role || 'subscriber',
          new_role: newRole,
          notes: `Promoted by ${user.role}`,
          created_at: new Date().toISOString(),
        });

      // Send notification to promoted user
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: '🎉 ¡Promoción de Rol!',
          message: `¡Felicidades! Has sido promovido a ${newRole === 'member' ? 'Usuario Miembro' : 'Usuario Administrador'}. Ahora tienes acceso a nuevas funciones.`,
          type: 'role_promotion',
          read: false,
          created_at: new Date().toISOString(),
        });

      alert(`Usuario promovido a ${newRole === 'member' ? 'Miembro' : 'Administrador'} correctamente`);
    } catch (error) {
      console.error('Error promoting user:', error);
      alert('Error al promover usuario');
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
            
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-400">Cargando shots pendientes...</div>
              </div>
            ) : shots.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400">No hay shots pendientes de aprobación</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shots.map((shot) => (
                  <div key={shot.id} className="bg-gray-900 rounded-lg overflow-hidden">
                    <img
                      src={shot.image_url}
                      alt={shot.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{shot.title}</h3>
                      <p className="text-gray-400 text-sm mb-3">{shot.description}</p>
                      <div className="text-xs text-gray-500 mb-4">
                        Por: @{shot.profiles?.username || 'Usuario desconocido'} • {formatDate(shot.created_at)}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveShot(shot.id)}
                          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                        >
                          ✅ Aprobar
                        </button>
                        <button
                          onClick={() => handleRejectShot(shot.id)}
                          className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
                        >
                          ❌ Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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