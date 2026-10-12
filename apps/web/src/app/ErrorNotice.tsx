import { ERROR_CATALOG, type ErrorCode } from '@wasabi-cross/schemas';
import { Button } from '@wasabi-cross/ui';
import { ApiError } from '../lib/http.ts';

export interface ErrorNoticeProps {
  error: unknown;
  /** Lo que se le dice a la persona en lugar del mensaje del error; el código y el pedido quedan. */
  message?: string;
  onRetry?: () => void;
}

/**
 * Un error, dicho para el usuario y con lo que soporte necesita: el código y el requestId
 * del pedido que falló (spec §13, docs/error-codes.md).
 */
export function ErrorNotice({ error, message, onRetry }: ErrorNoticeProps): React.JSX.Element {
  const known = error instanceof ApiError ? error : null;

  return (
    <div role="alert" className="error-notice">
      <p className="error-notice__message">
        {message ?? known?.message ?? 'Ocurrió un error inesperado.'}
      </p>
      {known ? (
        <p className="error-notice__meta">
          Código {known.errorCode} · pedido {known.requestId}
        </p>
      ) : null}
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Un aviso con el mensaje del catálogo para un código, sin pedido: lo que no salió de una llamada a
 * la API sino de una redirección (el `?error=` con el que el proveedor devuelve a `/login`).
 */
export function CodeNotice({ code }: { code: ErrorCode }): React.JSX.Element {
  return (
    <div role="alert" className="error-notice">
      <p className="error-notice__message">{ERROR_CATALOG[code].userMessage}</p>
      <p className="error-notice__meta">Código {code}</p>
    </div>
  );
}

/** El error a pantalla completa, para cuando no hay nada más que mostrar. */
export function ErrorScreen(props: ErrorNoticeProps): React.JSX.Element {
  return (
    <main className="wc-root screen">
      <ErrorNotice {...props} />
    </main>
  );
}
