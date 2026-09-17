import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.ts';

const minimal = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017',
  MONGODB_DB_NAME: 'wasabi_cross_test',
  WEB_ORIGIN: 'http://localhost:5173',
  BETTER_AUTH_SECRET: 'un-secret-de-al-menos-32-caracteres-ok',
  BETTER_AUTH_URL: 'http://localhost:3000',
};

describe('parseEnv', () => {
  it('aplica defaults razonables cuando sólo vienen las variables obligatorias', () => {
    const env = parseEnv(minimal);

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      HOST: '127.0.0.1',
      LOG_LEVEL: 'info',
    });
  });

  it('convierte PORT a número: las variables de entorno siempre llegan como string', () => {
    expect(parseEnv({ ...minimal, PORT: '8080' }).PORT).toBe(8080);
  });

  it('rechaza un PORT que no es un puerto', () => {
    expect(() => parseEnv({ ...minimal, PORT: '70000' })).toThrow(/PORT/);
    expect(() => parseEnv({ ...minimal, PORT: 'ocho mil' })).toThrow(/PORT/);
  });

  it('rechaza un secret corto y dice cuál es el mínimo', () => {
    expect(() => parseEnv({ ...minimal, BETTER_AUTH_SECRET: 'corto' })).toThrow(
      /al menos 32 caracteres/,
    );
  });

  it('rechaza un WEB_ORIGIN que no es una URL', () => {
    expect(() => parseEnv({ ...minimal, WEB_ORIGIN: 'localhost:5173' })).toThrow(/WEB_ORIGIN/);
  });

  it('no levanta si falta una variable obligatoria, y la nombra', () => {
    const { MONGODB_URI: _omitido, ...sinMongo } = minimal;

    expect(() => parseEnv(sinMongo)).toThrow(/MONGODB_URI/);
  });

  it('junta todos los errores en un solo mensaje, no de a uno', () => {
    expect(() => parseEnv({})).toThrow(/MONGODB_URI[\s\S]*BETTER_AUTH_SECRET/);
  });

  it('rechaza un NODE_ENV que no existe', () => {
    expect(() => parseEnv({ ...minimal, NODE_ENV: 'staging-ish' })).toThrow(/NODE_ENV/);
  });
});
