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

  describe('AUTH_RATE_LIMIT — el límite de intentos de login y registro (spec §13)', () => {
    it('está prendido si nadie dice nada', () => {
      expect(parseEnv(minimal).AUTH_RATE_LIMIT).toBe('on');
    });

    it('se puede apagar fuera de producción: el E2E registra más de cinco atletas por minuto', () => {
      expect(parseEnv({ ...minimal, AUTH_RATE_LIMIT: 'off' }).AUTH_RATE_LIMIT).toBe('off');
    });

    it('en producción no se apaga: el proceso no levanta', () => {
      expect(() =>
        parseEnv({ ...minimal, NODE_ENV: 'production', AUTH_RATE_LIMIT: 'off' }),
      ).toThrow(/AUTH_RATE_LIMIT/);
    });

    it('un valor que no es on u off no pasa', () => {
      expect(() => parseEnv({ ...minimal, AUTH_RATE_LIMIT: 'false' })).toThrow(/AUTH_RATE_LIMIT/);
    });
  });

  describe('credenciales de los proveedores OAuth (F9-02, spec §5.6)', () => {
    const google = { GOOGLE_CLIENT_ID: 'google-id', GOOGLE_CLIENT_SECRET: 'google-secret' };
    const microsoft = {
      MICROSOFT_CLIENT_ID: 'microsoft-id',
      MICROSOFT_CLIENT_SECRET: 'microsoft-secret',
    };

    it('ninguna es obligatoria: sin ellas el proveedor queda apagado', () => {
      const env = parseEnv(minimal);

      expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
      expect(env.GOOGLE_CLIENT_SECRET).toBeUndefined();
      expect(env.MICROSOFT_CLIENT_ID).toBeUndefined();
      expect(env.MICROSOFT_CLIENT_SECRET).toBeUndefined();
    });

    it('cada proveedor se acepta con su par completo, y los dos juntos', () => {
      expect(parseEnv({ ...minimal, ...google })).toMatchObject(google);
      expect(parseEnv({ ...minimal, ...microsoft })).toMatchObject(microsoft);
      expect(parseEnv({ ...minimal, ...google, ...microsoft })).toMatchObject({
        ...google,
        ...microsoft,
      });
    });

    it.each([
      ['GOOGLE_CLIENT_ID', { GOOGLE_CLIENT_SECRET: 'x' }],
      ['GOOGLE_CLIENT_SECRET', { GOOGLE_CLIENT_ID: 'x' }],
      ['MICROSOFT_CLIENT_ID', { MICROSOFT_CLIENT_SECRET: 'x' }],
      ['MICROSOFT_CLIENT_SECRET', { MICROSOFT_CLIENT_ID: 'x' }],
    ])('si falta %s, el proceso no levanta y dice cuál falta', (missing, present) => {
      expect(() => parseEnv({ ...minimal, ...present })).toThrow(new RegExp(missing));
    });

    it('una variable vacía vale como ausente: un .env copiado del ejemplo no rompe nada', () => {
      const env = parseEnv({
        ...minimal,
        GOOGLE_CLIENT_ID: '',
        GOOGLE_CLIENT_SECRET: '',
        MICROSOFT_CLIENT_ID: '',
        MICROSOFT_CLIENT_SECRET: '',
      });

      expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
      expect(env.MICROSOFT_CLIENT_SECRET).toBeUndefined();
    });

    it('un par a medias con la otra mitad vacía también falla', () => {
      expect(() =>
        parseEnv({ ...minimal, GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: '' }),
      ).toThrow(/GOOGLE_CLIENT_SECRET/);
    });

    it('las credenciales andan en producción', () => {
      expect(
        parseEnv({ ...minimal, NODE_ENV: 'production', ...google, ...microsoft }),
      ).toMatchObject(google);
    });
  });

  describe('OAUTH_DEV_IDP — el IdP de desarrollo (F9-03)', () => {
    it('está apagado si nadie dice nada', () => {
      expect(parseEnv(minimal).OAUTH_DEV_IDP).toBe('off');
    });

    it('se puede prender fuera de producción', () => {
      expect(parseEnv({ ...minimal, OAUTH_DEV_IDP: 'on' }).OAUTH_DEV_IDP).toBe('on');
      expect(parseEnv({ ...minimal, NODE_ENV: 'test', OAUTH_DEV_IDP: 'on' }).OAUTH_DEV_IDP).toBe(
        'on',
      );
    });

    it('en producción no se prende: un IdP que acepta a cualquiera sería un bypass', () => {
      expect(() => parseEnv({ ...minimal, NODE_ENV: 'production', OAUTH_DEV_IDP: 'on' })).toThrow(
        /OAUTH_DEV_IDP/,
      );
    });

    it('apagado en producción es lo normal', () => {
      expect(parseEnv({ ...minimal, NODE_ENV: 'production', OAUTH_DEV_IDP: 'off' })).toBeDefined();
    });

    it('un valor que no es on u off no pasa', () => {
      expect(() => parseEnv({ ...minimal, OAUTH_DEV_IDP: 'true' })).toThrow(/OAUTH_DEV_IDP/);
    });
  });

  describe('MICROSOFT_AUTHORITY — apunta a Microsoft al IdP falso (F9-03)', () => {
    const authority = 'http://127.0.0.1:3102';

    it('es opcional', () => {
      expect(parseEnv(minimal).MICROSOFT_AUTHORITY).toBeUndefined();
    });

    it('se acepta junto con el IdP de desarrollo', () => {
      expect(
        parseEnv({ ...minimal, OAUTH_DEV_IDP: 'on', MICROSOFT_AUTHORITY: authority })
          .MICROSOFT_AUTHORITY,
      ).toBe(authority);
    });

    it('sin el IdP de desarrollo no se acepta: sólo existe para probar contra él', () => {
      expect(() => parseEnv({ ...minimal, MICROSOFT_AUTHORITY: authority })).toThrow(
        /MICROSOFT_AUTHORITY/,
      );
    });

    it('en producción no se acepta, ni siquiera con el IdP prendido', () => {
      expect(() =>
        parseEnv({
          ...minimal,
          NODE_ENV: 'production',
          OAUTH_DEV_IDP: 'on',
          MICROSOFT_AUTHORITY: authority,
        }),
      ).toThrow(/MICROSOFT_AUTHORITY/);
    });

    it('tiene que ser una URL http o https', () => {
      expect(() =>
        parseEnv({ ...minimal, OAUTH_DEV_IDP: 'on', MICROSOFT_AUTHORITY: 'localhost:3102' }),
      ).toThrow(/MICROSOFT_AUTHORITY/);
    });

    it('una variable vacía vale como ausente', () => {
      expect(parseEnv({ ...minimal, MICROSOFT_AUTHORITY: '' }).MICROSOFT_AUTHORITY).toBeUndefined();
    });
  });
});
