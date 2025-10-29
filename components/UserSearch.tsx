// components/UserSearch.tsx

"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserWithRole, UserRole, getRoleDisplayName } from '../lib/roleUtils';

interface UserSearchProps {
  searchRole: UserRole;
  targetRole: UserRole;
  onPromote: (userId: string, newRole: UserRole) => Promise<void>;
  title: string;
  description: string;
}

export default function UserSearch({ 
  searchRole, 
  targetRole, 
  onPromote, 
  title, 
  description 
}: UserSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchTerm]);

  const searchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, role, created_at, promoted_by, promoted_at, is_admin')
        .eq('role', searchRole)
        .ilike('username', `%${searchTerm}%`)
        .limit(10);

      if (error) {
        console.error('Error searching users:', error);
        return;
      }

      // Convert to UserWithRole format (we'll need to get email from auth if needed)
      const usersWithRole: UserWithRole[] = (data || []).map(profile => ({
        id: profile.id,
        email: '', // We'll show username instead
        username: profile.username,
        role: profile.role || 'subscriber',
        created_at: profile.created_at,
        promoted_by: profile.promoted_by,
        promoted_at: profile.promoted_at,
        is_admin: profile.is_admin
      }));

      setUsers(usersWithRole);
    } catch (error) {
      console.error('Error in searchUsers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handlePromoteSelected = async () => {
    if (selectedUsers.size === 0) return;

    setPromoting(true);
    try {
      for (const userId of selectedUsers) {
        await onPromote(userId, targetRole);
      }
      
      // Clear selection and refresh search
      setSelectedUsers(new Set());
      if (searchTerm.length >= 2) {
        await searchUsers();
      }
    } catch (error) {
      console.error('Error promoting users:', error);
    } finally {
      setPromoting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder={`Buscar ${getRoleDisplayName(searchRole).toLowerCase()}s por nombre de usuario...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-4">
          <div className="text-gray-400">Buscando usuarios...</div>
        </div>
      )}

      {/* Search Results */}
      {users.length > 0 && (
        <div className="space-y-2 mb-4">
          <h4 className="text-sm font-medium text-gray-300">
            Resultados de búsqueda ({users.length})
          </h4>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.id)}
                    onChange={() => handleUserToggle(user.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div>
                    <div className="text-white font-medium">@{user.username}</div>
                    <div className="text-gray-400 text-sm">
                      {getRoleDisplayName(user.role)} • Registrado: {formatDate(user.created_at)}
                    </div>
                  </div>
                </div>
                <div className="text-gray-400 text-sm">
                  👤
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {searchTerm.length >= 2 && !loading && users.length === 0 && (
        <div className="text-center py-4">
          <div className="text-gray-400">No se encontraron usuarios</div>
        </div>
      )}

      {/* Promote Button */}
      {selectedUsers.size > 0 && (
        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              {selectedUsers.size} usuario(s) seleccionado(s)
            </div>
            <button
              onClick={handlePromoteSelected}
              disabled={promoting}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {promoting ? 'Promoviendo...' : `Promover a ${getRoleDisplayName(targetRole)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}