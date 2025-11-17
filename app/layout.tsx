// aalvar-app/app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../lib/AuthContext'; // Importamos el proveedor

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "A'AL",
  description: 'Descubre ideas increíbles',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {/* Envuelve toda la aplicación con nuestro proveedor de autenticación */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}