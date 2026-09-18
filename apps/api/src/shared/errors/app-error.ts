import { ERROR_CATALOG, type ErrorCode } from './error-codes.ts';

/**
 * Error de negocio. Siempre lleva un `errorCode` del catálogo: el HTTP status y el
 * mensaje al usuario salen de ahí, no de quien lanza el error, para que la misma
 * situación responda igual desde cualquier módulo.
 *
 * `meta` es contexto para el log. Nunca metas ahí password, token ni datos de pago:
 * el logger los redacta por path, pero la regla es no ponerlos de entrada.
 *
 * `params` completa las variables del mensaje del catálogo (`{plan}`, `{limite}`). Una
 * variable que no se pasa queda visible tal cual: mejor un `{plan}` que se note en un test
 * que un "tu plan ." que pase inadvertido.
 */
export class AppError extends Error {
  readonly errorCode: ErrorCode;
  readonly statusCode: number;
  readonly userMessage: string;
  readonly meta: Readonly<Record<string, unknown>>;

  constructor(
    errorCode: ErrorCode,
    options: {
      message?: string;
      meta?: Record<string, unknown>;
      params?: Record<string, string>;
      cause?: unknown;
    } = {},
  ) {
    const entry = ERROR_CATALOG[errorCode];
    const userMessage = fillParams(entry.userMessage, options.params ?? {});
    super(options.message ?? userMessage, { cause: options.cause });

    this.name = 'AppError';
    this.errorCode = errorCode;
    this.statusCode = entry.status;
    this.userMessage = userMessage;
    this.meta = Object.freeze({ ...options.meta });
  }
}

function fillParams(template: string, params: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => params[name] ?? placeholder);
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
