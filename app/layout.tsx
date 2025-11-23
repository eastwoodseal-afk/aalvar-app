// aalvar-app/app/layout.tsx

import type { Metadata } from 'next';
import ClientRootLayout from './layout-client';

export const metadata: Metadata = {
  title: "A'AL",
  description: 'Descubre ideas increíbles',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ClientRootLayout>{children}</ClientRootLayout>
      </body>
    </html>
  );
}