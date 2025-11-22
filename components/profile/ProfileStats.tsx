"use client";

import { useEffect, useState } from 'react';
import { UserStats, getUserStats } from '../../lib/profile/profileUtils';
import { useAuth } from '../../lib/AuthContext';
import { getRoleDisplayName } from '../../lib/roleUtils';

export default function ProfileStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user?.id) return;
    setLoading(true);
    const data = await getUserStats(user.id);
    setStats(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-800 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
        No se pudieron cargar las estadísticas
      </div>
    );
  }

  const shotApprovalRate = stats.totalShots > 0 
    ? Math.round((stats.approvedShots / stats.totalShots) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header con info básica */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">@{user?.username}</h3>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                user?.role === 'superadmin' ? 'bg-purple-600/20 text-purple-300 border border-purple-500' :
                user?.role === 'admin' ? 'bg-yellow-600/20 text-yellow-300 border border-yellow-500' :
                user?.role === 'member' ? 'bg-blue-600/20 text-blue-300 border border-blue-500' :
                'bg-gray-600/20 text-gray-300 border border-gray-500'
              }`}>
                {getRoleDisplayName(user?.role || 'subscriber')}
              </span>
              <span className="text-gray-400 text-sm">📅 Miembro desde {stats.accountAge}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[#D4AF37]">{stats.totalShots}</div>
            <div className="text-xs text-gray-400">Shots creados</div>
          </div>
        </div>
      </div>

      {/* Grid de estadísticas */}
      <div className="grid grid-cols-2 gap-4">
        {/* Shots aprobados */}
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-green-500/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Shots Aprobados</span>
            <span className="text-2xl">✅</span>
          </div>
          <div className="text-3xl font-bold text-green-400">{stats.approvedShots}</div>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${shotApprovalRate}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">{shotApprovalRate}% de tus shots</div>
        </div>

        {/* Shots pendientes */}
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-yellow-500/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Pendientes</span>
            <span className="text-2xl">⏳</span>
          </div>
          <div className="text-3xl font-bold text-yellow-400">{stats.pendingShots}</div>
          <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-yellow-500 transition-all duration-500"
              style={{ width: stats.totalShots > 0 ? `${(stats.pendingShots / stats.totalShots) * 100}%` : '0%' }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">En revisión</div>
        </div>

        {/* Shots guardados */}
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-[#D4AF37]/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Shots Guardados</span>
            <span className="text-2xl">💾</span>
          </div>
          <div className="text-3xl font-bold text-[#D4AF37]">{stats.savedShots}</div>
          <div className="text-xs text-gray-400 mt-2">Colección personal</div>
        </div>

        {/* Tableros */}
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-blue-500/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Tableros</span>
            <span className="text-2xl">📋</span>
          </div>
          <div className="text-3xl font-bold text-blue-400">{stats.totalBoards}</div>
          <div className="text-xs text-gray-400 mt-2">Colecciones organizadas</div>
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
          <span className="text-xl">📈</span>
          Resumen de Actividad
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-700">
            <span className="text-gray-400 text-sm">Tasa de aprobación</span>
            <span className="text-white font-semibold">{shotApprovalRate}%</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-700">
            <span className="text-gray-400 text-sm">Total de contenido</span>
            <span className="text-white font-semibold">{stats.totalShots + stats.savedShots} items</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-400 text-sm">Miembro desde</span>
            <span className="text-white font-semibold">{new Date(stats.joinDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
