import { useRegisterSW } from 'virtual:pwa-register/react';
import { PwaNotice } from './PwaNotice.tsx';
import { useInstallPrompt } from './useInstallPrompt.ts';

/**
 * Los avisos de la PWA (spec §5), en un único popup a la vez: si coinciden una versión nueva y la
 * propuesta de instalar, gana la versión nueva, y al descartarla sigue la otra.
 *
 * El service worker se registra en modo `prompt` (F0-01): baja la versión nueva y espera. Acá se
 * le avisa al usuario, que decide cuándo recargar — nunca se le cambia la app debajo de los pies
 * mientras la está usando. `useRegisterSW` se llama una sola vez: cada llamada registra el worker.
 */
export function PwaNotices(): React.JSX.Element | null {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const install = useInstallPrompt();

  if (needRefresh) {
    return (
      <PwaNotice
        label="Versión nueva disponible"
        message="Hay una versión nueva de Wasabi Cross."
        dismissLabel="Ahora no"
        // Hasta la próxima versión no vuelve a aparecer: el service worker avisa de nuevo.
        onDismiss={() => {
          setNeedRefresh(false);
        }}
        action={{
          label: 'Actualizar',
          onClick: () => {
            void updateServiceWorker();
          },
        }}
      />
    );
  }

  if (install.mode === 'native') {
    return (
      <PwaNotice
        label="Instalar la app"
        message="Instalá Wasabi Cross en tu dispositivo y abrila como una app."
        dismissLabel="Ahora no"
        onDismiss={install.dismiss}
        action={{
          label: 'Instalar',
          onClick: () => {
            void install.install();
          },
        }}
      />
    );
  }

  if (install.mode === 'manual') {
    return (
      <PwaNotice
        label="Instalar la app"
        message="Para instalar Wasabi Cross tocá Compartir y elegí «Agregar a inicio»."
        dismissLabel="Entendido"
        onDismiss={install.dismiss}
      />
    );
  }

  return null;
}
