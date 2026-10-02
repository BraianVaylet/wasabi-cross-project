import { Button } from '@wasabi-cross/ui';
import './pwa-notice.css';

export interface PwaNoticeProps {
  /** Nombre accesible del aviso: es lo que anuncia el lector de pantalla al aparecer. */
  label: string;
  message: string;
  /** Salida del aviso. Siempre hay una: un popup que no se puede cerrar no es un aviso. */
  dismissLabel: string;
  onDismiss: () => void;
  /** Lo que el aviso propone hacer. Sin acción, el aviso sólo informa. */
  action?: { label: string; onClick: () => void };
}

/**
 * El popup de la PWA (spec §5): una franja abajo, sin tapar lo que el usuario está haciendo,
 * con un mensaje, una acción y una salida. Lo usan los avisos de versión nueva y de instalación;
 * quien lo usa decide cuándo mostrarlo, acá sólo se dibuja.
 */
export function PwaNotice({
  label,
  message,
  dismissLabel,
  onDismiss,
  action,
}: PwaNoticeProps): React.JSX.Element {
  return (
    // Vive fuera del shell, así que lleva su propio `wc-root`: la tipografía y el foco del tema.
    <div role="status" aria-label={label} className="wc-root pwa-notice">
      <p className="pwa-notice__text">{message}</p>
      <div className="pwa-notice__actions">
        <Button variant="ghost" onClick={onDismiss}>
          {dismissLabel}
        </Button>
        {action && <Button onClick={action.onClick}>{action.label}</Button>}
      </div>
    </div>
  );
}
