import { pino } from 'pino';
import type { Env } from '../../../config/env.ts';
import { buildLoggerOptions } from '../../../shared/logger.ts';

/** Los niveles de Better Auth que llegan a `log` (el `success` se le entrega como `info`). */
type AuthLogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Lo único que se conserva de lo que Better Auth le pasa a su logger. Los errores del callback
 * traen los valores del flujo adentro (`{ code: 'state_mismatch', details: { state } }`, un error
 * del endpoint de tokens, el query inválido…): qué pasó alcanza para depurar; los valores son el
 * `code` que se canjea por tokens y la mitad del chequeo contra CSRF (F9-06, ADR-0012).
 */
const KEPT_FIELDS = ['name', 'code', 'provider', 'providerId'] as const;

/**
 * Los campos que se pueden loguear de los argumentos de un log de Better Auth. Sólo strings, y
 * sólo los de `KEPT_FIELDS`: ni los mensajes de los errores, ni el stack, ni los `details`.
 */
export function safeLogFields(args: readonly unknown[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const arg of args) {
    if (typeof arg !== 'object' || arg === null) continue;
    for (const key of KEPT_FIELDS) {
      const value = (arg as Record<string, unknown>)[key];
      if (typeof value === 'string') fields[key] = value;
    }
  }
  return fields;
}

/**
 * El `logger` de Better Auth. Por defecto escribe a `console`, fuera del log estructurado y sin
 * pasar por la redacción; acá escribe por Pino —mismas opciones, mismo formato— y con
 * `safeLogFields` en vez de los argumentos tal cual. `stream` es para los tests.
 */
export function buildAuthLogger(env: Env, stream?: NodeJS.WritableStream) {
  const logger = pino(buildLoggerOptions(env, stream), stream).child({ component: 'better-auth' });

  return {
    log: (level: AuthLogLevel, message: string, ...args: unknown[]): void => {
      logger[level](safeLogFields(args), message);
    },
  };
}
