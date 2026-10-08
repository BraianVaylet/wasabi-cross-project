import type { FastifyRequest, FastifyServerOptions } from 'fastify';
import type { Env } from '../config/env.ts';

/**
 * Campos que nunca pueden salir en un log (CLAUDE.md → Prohibido; spec §13).
 * Se redactan por path en Pino, no por disciplina de quien escribe el log.
 */
const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  '*.password',
  'currentPassword',
  'newPassword',
  'token',
  '*.token',
  'accessToken',
  'refreshToken',
  'sessionToken',
  'secret',
  '*.secret',
  'card',
  '*.card',
  'cardNumber',
  'cvv',
  // El flujo OAuth (F9-06, ADR-0012): el id token del proveedor y el secret con que la API se
  // identifica ante él. Los tokens de acceso y refresh ya estaban arriba.
  'idToken',
  '*.idToken',
  'clientSecret',
  '*.clientSecret',
] as const;

/**
 * La URL sin el query ni el fragmento. El callback de OAuth vuelve con `?code=…&state=…`: el
 * `code` se canjea por tokens y el `state` es la mitad del chequeo contra CSRF, así que ninguno de
 * los dos puede quedar en un log. Para depurar alcanza con el path.
 */
export function withoutQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/**
 * Los serializadores. `req` es el de Fastify (mismos campos, que arman el "incoming request" de
 * cada petición) con la URL sin query. `url` cubre las que se agregan a mano en un log
 * (`{ url: request.url }`, en el error handler y en `auth.routes.ts`): sin esto habría que
 * acordarse en cada una.
 */
const SERIALIZERS = {
  // `Partial`: un serializador que tira rompe el log (y la petición con él), así que tolera lo que
  // no trae en vez de suponerlo.
  req: (request: Partial<FastifyRequest>): Record<string, unknown> => ({
    method: request.method,
    url: typeof request.url === 'string' ? withoutQuery(request.url) : request.url,
    version: request.headers?.['accept-version'],
    host: request.host,
    remoteAddress: request.ip,
    remotePort: request.socket?.remotePort,
  }),
  url: (url: unknown) => (typeof url === 'string' ? withoutQuery(url) : url),
};

/**
 * Las opciones del logger de Fastify. `stream` es para los tests, que leen lo que se escribió; en
 * la app real no se pasa y Pino escribe a stdout
 * (con pino-pretty, en desarrollo).
 */
export function buildLoggerOptions(
  env: Env,
  stream?: NodeJS.WritableStream,
): Exclude<NonNullable<FastifyServerOptions['logger']>, boolean> {
  return {
    level: env.LOG_LEVEL,
    // Formato de log definido en docs/architecture.md.
    base: { env: env.NODE_ENV, service: 'api' },
    timestamp: () => `,"ts":"${new Date().toISOString()}"`,
    redact: { paths: [...REDACTED_PATHS], censor: '[REDACTED]' },
    serializers: SERIALIZERS,
    ...(stream ? { stream } : {}),
    // Pino no admite `transport` y `stream` a la vez: si alguien pide un stream, gana.
    ...(env.NODE_ENV === 'development' && !stream
      ? {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
          },
        }
      : {}),
  };
}
