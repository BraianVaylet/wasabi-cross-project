import type { FastifyServerOptions } from 'fastify';
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
] as const;

export function buildLoggerOptions(env: Env): NonNullable<FastifyServerOptions['logger']> {
  return {
    level: env.LOG_LEVEL,
    // Formato de log definido en docs/architecture.md.
    base: { env: env.NODE_ENV, service: 'api' },
    timestamp: () => `,"ts":"${new Date().toISOString()}"`,
    redact: { paths: [...REDACTED_PATHS], censor: '[REDACTED]' },
    ...(env.NODE_ENV === 'development'
      ? {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
          },
        }
      : {}),
  };
}
