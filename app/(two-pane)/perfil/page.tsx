import { Suspense } from 'react';
import ProfileView from '../../../components/profile/ProfileView';

export default function PerfilPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Cargando perfil...</div>}>
      <ProfileView />
    </Suspense>
  );
}
