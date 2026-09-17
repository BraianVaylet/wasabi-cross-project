import type { ErrorCode } from '../../../shared/errors/error-codes.ts';
import { ERROR_CATALOG } from '../../../shared/errors/error-codes.ts';

/**
 * Better Auth responde con su propio formato de error. Acá se traduce al envelope
 * único de la API para que el front no tenga que entender dos formatos distintos.
 */
export interface TranslatedAuthError {
  errorCode: ErrorCode;
  message: string;
}

const BY_STATUS: Record<number, ErrorCode> = {
  401: 'WC-AUTH-401-001',
  403: 'WC-AUTH-403-002',
  429: 'WC-AUTH-429-003',
};

export function translateAuthError(status: number, body: string): TranslatedAuthError {
  const mapped = BY_STATUS[status];

  if (mapped) {
    // Mensaje del catálogo, no el de Better Auth: en un login fallido la respuesta
    // tiene que ser la misma exista o no el email (spec §13).
    return { errorCode: mapped, message: ERROR_CATALOG[mapped].userMessage };
  }

  if (status >= 400 && status < 500) {
    return {
      errorCode: 'WC-SYS-400-002',
      // Acá sí conviene el mensaje de Better Auth: dice qué tiene de malo la
      // contraseña o el email, que es lo que el usuario necesita para corregirlo.
      message: extractMessage(body) ?? ERROR_CATALOG['WC-SYS-400-002'].userMessage,
    };
  }

  return { errorCode: 'WC-SYS-500-001', message: ERROR_CATALOG['WC-SYS-500-001'].userMessage };
}

function extractMessage(body: string): string | null {
  try {
    const parsed: unknown = JSON.parse(body);

    if (typeof parsed === 'object' && parsed !== null && 'message' in parsed) {
      const { message } = parsed;
      return typeof message === 'string' && message.length > 0 ? message : null;
    }
  } catch {
    // El body no era JSON. No es un caso esperado, pero tampoco vale romper por eso.
  }

  return null;
}
