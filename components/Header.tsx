// components/Header.tsx

"use client";

import { useAuth } from '../lib/AuthContext';
import { canAccessSection, getRoleDisplayName } from '../lib/roleUtils';
import NotificationSystem from './NotificationSystem';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActivePath = (path: string) => {
    return pathname === path;
  };

  const navItems = [
    {
      name: 'Muro Principal',
      path: '/',
      section: 'main-wall',
      icon: '🏠'
    },
    {
      name: 'Shots Guardados',
      path: '/shots-guardados',
      section: 'saved-shots',
      icon: '💾'
    },
    {
      name: 'Mis Shots',
      path: '/mis-shots',
      section: 'my-shots',
      icon: '📷'
    },
    {
      name: 'Crear Shot',
      path: '/crear-shot',
      section: 'create-shots',
      icon: '➕'
    },
    {
      name: 'Panel Admin',
      path: '/admin',
      section: 'admin-panel',
      icon: '⚙️'
    }
  ];

  return (
    <header className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-white text-xl font-bold">
              📸 ShotWall
            </Link>
          </div>

          {/* Navigation */}
          {user && (
            <nav className="hidden md:flex space-x-8">
              {navItems.map((item) => {
                if (!canAccessSection(user.role, item.section)) return null;
                
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActivePath(item.path)
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Notifications */}
                <NotificationSystem />
                
                {/* User Info */}
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      {user.email}
                    </div>
                    <div className="text-xs text-gray-400">
                      {getRoleDisplayName(user.role)}
                    </div>
                  </div>
                  
                  {/* User Avatar */}
                  <div className="h-8 w-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  {/* Sign Out */}
                  <button
                    onClick={handleSignOut}
                    className="text-gray-300 hover:text-white transition-colors"
                    title="Cerrar Sesión"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/auth"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Iniciar Sesión
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {user && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-800">
              {navItems.map((item) => {
                if (!canAccessSection(user.role, item.section)) return null;
                
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActivePath(item.path)
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}