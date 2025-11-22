import { Suspense } from 'react';
import MisShotsView from '../../../components/MisShotsView';

export default function CrearShotPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Cargando...</div>}>
      <MisShotsView />
    </Suspense>
  );
}
