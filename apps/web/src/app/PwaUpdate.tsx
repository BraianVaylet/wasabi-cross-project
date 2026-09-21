import { Button } from '@wasabi-cross/ui';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './pwa-update.css';

/**
 * Aviso de versión nueva (spec §5). El service worker se registra en modo `prompt`
 * (F0-01): baja la versión nueva y espera. Acá se le avisa al usuario, que decide cuándo
 * recargar — nunca se le cambia la app debajo de los pies mientras la está usando.
 */
export function PwaUpdate(): React.JSX.Element | null {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }

  return (
    <div role="status" aria-label="Versión nueva disponible" className="pwa-update">
      <p className="pwa-update__text">Hay una versión nueva de Wasabi Cross.</p>
      <div className="pwa-update__actions">
        <Button
          variant="ghost"
          onClick={() => {
            // Hasta la próxima versión no vuelve a aparecer: el service worker avisa de nuevo.
            setNeedRefresh(false);
          }}
        >
          Ahora no
        </Button>
        <Button
          onClick={() => {
            void updateServiceWorker();
          }}
        >
          Actualizar
        </Button>
      </div>
    </div>
  );
}
