import type { ErrorCode } from '../../../shared/errors/error-codes.ts';
import { ERROR_CATALOG } from '../../../shared/errors/error-codes.ts';

/**
 * Better Auth responde con su propio formato de error. Acá se traduce al envelope
 * único de la API para que el front no tenga que entender dos formatos distintos.
 *
 * Siempre sale el mensaje del catálogo, nunca el de Better Auth: con el ingreso sólo por OAuth
 * (F9-05) ya no hay una contraseña ni un email que explicar, y lo que dice Better Auth habla de
 * callbacks y de proveedores, en inglés. El detalle queda en el log del servidor.
 */
export interface TranslatedAuthError {
  errorCode: ErrorCode;
  message: string;
}

const BY_STATUS: Record<number, ErrorCode> = {
  // Sin sesión: la misma respuesta que el resto de la API (`requireSession`).
  401: 'WC-AUTH-401-004',
  403: 'WC-AUTH-403-002',
  404: 'WC-SYS-404-003',
  429: 'WC-AUTH-429-003',
};

export function translateAuthError(status: number, _body: string): TranslatedAuthError {
  const mapped = BY_STATUS[status];
  if (mapped) return { errorCode: mapped, message: ERROR_CATALOG[mapped].userMessage };

  if (status >= 400 && status < 500) {
    return {
      errorCode: 'WC-SYS-400-002',
      message: ERROR_CATALOG['WC-SYS-400-002'].userMessage,
    };
  }

  return { errorCode: 'WC-SYS-500-001', message: ERROR_CATALOG['WC-SYS-500-001'].userMessage };
}
