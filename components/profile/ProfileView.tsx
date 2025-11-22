"use client";

import { useState } from 'react';
import ProfileStats from './ProfileStats';
import ProfileSettings from './ProfileSettings';
import ProfileSecurity from './ProfileSecurity';
import ProfileDangerZone from './ProfileDangerZone';

type Tab = 'stats' | 'settings' | 'security' | 'danger';

export default function ProfileView() {
  const [activeTab, setActiveTab] = useState<Tab>('stats');

  const tabs = [
    { id: 'stats' as Tab, label: 'Resumen', icon: '📊' },
    { id: 'settings' as Tab, label: 'Configuración', icon: '⚙️' },
    { id: 'security' as Tab, label: 'Seguridad', icon: '🔒' },
    { id: 'danger' as Tab, label: 'Zona de Peligro', icon: '🗑️' },
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Mi Perfil</h1>
          <p className="text-gray-400">Gestiona tu cuenta y preferencias</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-800">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.id
                    ? tab.id === 'danger'
                      ? 'border-red-500 text-red-400'
                      : 'border-[#D4AF37] text-[#D4AF37]'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="pb-12">
          {activeTab === 'stats' && <ProfileStats />}
          {activeTab === 'settings' && <ProfileSettings />}
          {activeTab === 'security' && <ProfileSecurity />}
          {activeTab === 'danger' && <ProfileDangerZone />}
        </div>
      </div>
    </div>
  );
}
