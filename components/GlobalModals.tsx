"use client";
import { useRightPanel } from '../lib/RightPanelContext';
import CreateShotModal from './CreateShotModal';
import { useAuth } from '../lib/AuthContext';

export default function GlobalModals() {
  const { rightPanel, setRightPanel } = useRightPanel();
  const { user } = useAuth();
  const handleClose = () => {
    // Elimina el parámetro modal de la URL y cierra el modal
    setRightPanel(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('modal');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  };
  if (rightPanel?.type === 'modal' && rightPanel.modal === 'crear-shot' && user) {
    return (
      <CreateShotModal onClose={handleClose} embedded={false} />
    );
  }
  return null;
}
