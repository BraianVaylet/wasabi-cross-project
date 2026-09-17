import type { Env } from '../config/env.ts';

/**
 * Entorno de test. Los valores son fijos y evidentes a propósito: si un test
 * depende de un secret real, es que está probando la cosa equivocada.
 */
export function testEnv(overrides: Partial<Env> = {}): Env {
  return {
    NODE_ENV: 'test',
    PORT: 0,
    HOST: '127.0.0.1',
    LOG_LEVEL: 'silent',
    MONGODB_URI: 'mongodb://127.0.0.1:27017',
    MONGODB_DB_NAME: 'wasabi_cross_test',
    WEB_ORIGIN: 'http://localhost:5173',
    BETTER_AUTH_SECRET: 'test-secret-de-al-menos-32-caracteres-ok',
    BETTER_AUTH_URL: 'http://localhost:3000',
    ...overrides,
  };
}
