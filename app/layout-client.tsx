"use client";

import { AuthProvider } from '../lib/AuthContext';
import { RightPanelProvider } from '../lib/RightPanelContext';
import GlobalModals from '../components/GlobalModals';

import { Inter } from 'next/font/google';
import './globals.css';
const inter = Inter({ subsets: ['latin'] });

export default function ClientRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RightPanelProvider>
        <div className={inter.className}>
          {children}
          <GlobalModals />
        </div>
      </RightPanelProvider>
    </AuthProvider>
  );
}
