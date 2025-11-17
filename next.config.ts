import type { NextConfig } from "next";
import bundleAnalyzer from '@next/bundle-analyzer';

// Intento de detección dinámica del hostname de Supabase para imágenes remotas.
// Si la variable no existe o falla el parseo, next/image seguirá requiriendo ajuste manual.
let supabaseHost: string | undefined;
try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const u = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    supabaseHost = u.hostname; // ejemplo: xyzcompany.supabase.co
  }
} catch {
  // ignore parse errors
}

const nextConfig: NextConfig = {
  images: {
    // Si no se logró detectar, se deja arreglo vacío para evitar errores; el componente puede usar unoptimized.
    remotePatterns: supabaseHost ? [
      {
        protocol: 'https',
        hostname: supabaseHost,
        pathname: '/storage/v1/object/public/**'
      }
    ] : [],
    formats: ['image/avif', 'image/webp'],
  },
};
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

export default withBundleAnalyzer(nextConfig);
