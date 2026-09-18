import { Button } from '@wasabi-cross/ui';
import { ApiError } from '../lib/http.ts';

export interface ErrorNoticeProps {
  error: unknown;
  onRetry?: () => void;
}

/**
 * Un error, dicho para el usuario y con lo que soporte necesita: el código y el requestId
 * del pedido que falló (spec §13, docs/error-codes.md).
 */
export function ErrorNotice({ error, onRetry }: ErrorNoticeProps): React.JSX.Element {
  const known = error instanceof ApiError ? error : null;

  return (
    <div role="alert" className="error-notice">
      <p className="error-notice__message">{known?.message ?? 'Ocurrió un error inesperado.'}</p>
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

/** El error a pantalla completa, para cuando no hay nada más que mostrar. */
export function ErrorScreen(props: ErrorNoticeProps): React.JSX.Element {
  return (
    <main className="wc-root screen">
      <ErrorNotice {...props} />
    </main>
  );
}
