// components/RoleManager.tsx

"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserWithRole, getRoleDisplayName, RolePromotion } from '../lib/roleUtils';

interface RoleManagerProps {
  currentRole: 'admin' | 'superadmin';
}

export default function RoleManager({ currentRole }: RoleManagerProps) {
  const [admins, setAdmins] = useState<UserWithRole[]>([]);
  const [selectedAdmins, setSelectedAdmins] = useState<Set<string>>(new Set());
  const [demotedAdmins, setDemotedAdmins] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [recentPromotions, setRecentPromotions] = useState<RolePromotion[]>([]);

  useEffect(() => {
    fetchAdmins();
    fetchRecentPromotions();
  }, []);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, role, created_at, promoted_by, promoted_at')
        .eq('role', 'admin')
        .order('promoted_at', { ascending: false });

      if (error) {
        console.error('Error fetching admins:', error);
        return;
      }

      const adminsWithRole: UserWithRole[] = (data || []).map(profile => ({
        id: profile.id,
        email: '', // We'll show username instead
        username: profile.username,
        role: profile.role || 'admin',
        created_at: profile.created_at,
        promoted_by: profile.promoted_by,
        promoted_at: profile.promoted_at,
      }));

      setAdmins(adminsWithRole);
      // Initialize selected admins (empty by default - user must manually select to demote)
      setSelectedAdmins(new Set());
    } catch (error) {
      console.error('Error in fetchAdmins:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_promotions')
        .select(`
          id,
          user_id,
          promoted_by,
          old_role,
          new_role,
          created_at,
          notes,
          profiles!role_promotions_user_id_fkey(username),
          promoter:profiles!role_promotions_promoted_by_fkey(username)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching promotions:', error);
        return;
      }

      setRecentPromotions(data || []);
    } catch (error) {
      console.error('Error in fetchRecentPromotions:', error);
    }
  };

  const handleAdminToggle = (adminId: string) => {
    const newSelected = new Set(selectedAdmins);
    if (newSelected.has(adminId)) {
      newSelected.delete(adminId);
    } else {
      newSelected.add(adminId);
    }
    setSelectedAdmins(newSelected);
  };

  const handleUpdateAdminRoles = async () => {
    if (currentRole !== 'superadmin') return;

    setUpdating(true);
    try {
      // Get current user for logging
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Determine which admins to demote (now based on selection, not deselection)
      const toDemote = admins.filter(admin => selectedAdmins.has(admin.id));
      const newDemoted = new Set(demotedAdmins);
      
      for (const admin of toDemote) {
        // Update user role to member
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            role: 'member',
            promoted_by: currentUser.id,
            promoted_at: new Date().toISOString()
          })
          .eq('id', admin.id);

        if (updateError) {
          console.error('Error demoting admin:', updateError);
          continue;
        }

        // Mark as demoted visually
        newDemoted.add(admin.id);

        // Log the demotion
        await supabase
          .from('role_promotions')
          .insert({
            user_id: admin.id,
            promoted_by: currentUser.id,
            old_role: 'admin',
            new_role: 'member',
            notes: 'Demoted by superadmin',
            created_at: new Date().toISOString(),
          });

        // Send notification
        await supabase
          .from('notifications')
          .insert({
            user_id: admin.id,
            title: 'Cambio de Rol',
            message: 'Tu rol ha sido cambiado a Usuario Miembro.',
            type: 'role_promotion',
            read: false,
            created_at: new Date().toISOString(),
          });
      }

      // Update demoted state
      setDemotedAdmins(newDemoted);

      // Refresh the admin list
      await fetchAdmins();
      await fetchRecentPromotions();
    } catch (error) {
      console.error('Error updating admin roles:', error);
    } finally {
      setUpdating(false);
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

  if (currentRole !== 'superadmin') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Current Administrators */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-2">
            Gestión de Administradores
          </h3>
          <p className="text-gray-400 text-sm">
            Selecciona los administradores que deseas degradar a miembros. Luego confirma la acción.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="text-gray-400">Cargando administradores...</div>
          </div>
        ) : admins.length === 0 ? (
          <div className="text-center py-4">
            <div className="text-gray-400">No hay administradores actualmente</div>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              {admins.map((admin) => {
                const isDemoted = demotedAdmins.has(admin.id);
                const isSelected = selectedAdmins.has(admin.id);
                return (
                  <div
                    key={admin.id}
                    onClick={() => !isDemoted && handleAdminToggle(admin.id)}
                    className={`flex items-center justify-between p-3 rounded-md transition-all duration-300 ${
                      isDemoted
                        ? 'bg-red-900/20 border-2 border-red-500'
                        : isSelected
                        ? 'bg-orange-600/20 border-2 border-orange-500 cursor-pointer'
                        : 'bg-gray-700 hover:bg-gray-600 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedAdmins.has(admin.id)}
                        onChange={() => {}}
                        disabled={isDemoted}
                        className="h-4 w-4 text-[#D4AF37] focus:ring-[#D4AF37] border-gray-300 rounded disabled:opacity-50 pointer-events-none"
                      />
                      <div>
                        <div className={`font-medium ${
                          isDemoted ? 'text-red-400' : isSelected ? 'text-orange-400' : 'text-white'
                        }`}>@{admin.username}</div>
                        <div className="text-gray-400 text-sm">
                          Promovido: {admin.promoted_at ? formatDate(admin.promoted_at) : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${
                      isDemoted ? 'text-red-400' : isSelected ? 'text-orange-400' : 'text-yellow-400'
                    }`}>
                      {isDemoted ? '⬇️ Degradado' : isSelected ? '⚠️ A degradar' : '👑 Administrador'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-300">
                  {selectedAdmins.size} administrador(es) seleccionado(s) para degradar
                </div>
                <button
                  onClick={handleUpdateAdminRoles}
                  disabled={updating || selectedAdmins.size === 0}
                  className="bg-orange-600 text-white px-4 py-2 font-semibold rounded-md hover:bg-orange-700 disabled:opacity-50 transition-colors"
                >
                  {updating ? 'Degradando...' : 'Confirmar Degradación'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recent Promotions Log */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-2">
            Historial de Promociones Recientes
          </h3>
          <p className="text-gray-400 text-sm">
            Últimas 10 promociones y degradaciones de roles
          </p>
        </div>

        {recentPromotions.length === 0 ? (
          <div className="text-center py-4">
            <div className="text-gray-400">No hay promociones recientes</div>
          </div>
        ) : (
          <div className="space-y-2">
            {recentPromotions.map((promotion) => (
              <div
                key={promotion.id}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-md"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {promotion.new_role === 'admin' ? '⬆️' : '⬇️'}
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      @{(promotion as any).profiles?.username || 'Usuario desconocido'}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {getRoleDisplayName(promotion.old_role)} → {getRoleDisplayName(promotion.new_role)}
                    </div>
                    <div className="text-gray-500 text-xs">
                      Por: @{(promotion as any).promoter?.username || 'Sistema'} • {formatDate(promotion.created_at)}
                    </div>
                  </div>
                </div>
                {promotion.notes && (
                  <div className="text-gray-400 text-xs max-w-xs">
                    {promotion.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
