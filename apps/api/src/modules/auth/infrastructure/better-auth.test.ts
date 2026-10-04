import type { BetterAuthPlugin } from 'better-auth';
import type { Db, MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectMongo, type MongoConnection } from '../../../shared/db/mongo.ts';
import type { Env } from '../../../config/env.ts';
import { testEnv } from '../../../test/env.ts';
import { createAuth } from './better-auth.ts';

describe('createAuth: testUtils sólo en el entorno de test (F9-04)', () => {
  let mongod: MongoMemoryServer;
  let mongo: MongoConnection;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    mongo = await connectMongo(testEnv({ MONGODB_URI: mongod.getUri() }));
  });

  afterAll(async () => {
    await mongo.close();
    await mongod.stop();
  });

  function pluginIds(nodeEnv: Env['NODE_ENV']): string[] {
    const auth = createAuth({
      env: testEnv({ NODE_ENV: nodeEnv }),
      db: mongo.db,
      client: mongo.client,
      transactions: false,
    });
    return auth.options.plugins.map((plugin) => plugin.id);
  }

  it('en test está: las sesiones de los tests se crean sin pasar por ningún formulario', () => {
    expect(pluginIds('test')).toContain('test-utils');
  });

  it.each(['development', 'production'] as const)(
    'con NODE_ENV=%s no está: sus helpers crean sesiones sin credenciales',
    (nodeEnv) => {
      expect(pluginIds(nodeEnv)).not.toContain('test-utils');
    },
  );

  it('con NODE_ENV=production no queda ningún plugin de prueba ni de desarrollo', () => {
    // Lo que sí queda en producción: la verificación de contraseñas filtradas (hasta F9-05).
    expect(pluginIds('production').filter((id) => id !== 'have-i-been-pwned')).toEqual([]);
  });
});

describe('createAuth: plugins extra (F9-03)', () => {
  const extraPlugin: BetterAuthPlugin = { id: 'idp-de-desarrollo' };
  // Nunca llegan a usarse: la guarda corta antes de armar el adaptador.
  const db = {} as Db;
  const client = {} as MongoClient;

  it('en producción no admite plugins extra: son del IdP de desarrollo y ahí no existe', () => {
    expect(() =>
      createAuth({ env: testEnv({ NODE_ENV: 'production' }), db, client, plugins: [extraPlugin] }),
    ).toThrow(/producción/);
  });

  it('la guarda mira el entorno y no el contenido: cualquier plugin extra se corta', () => {
    expect(() =>
      createAuth({
        env: testEnv({ NODE_ENV: 'production' }),
        db,
        client,
        plugins: [{ id: 'otro' }, extraPlugin],
      }),
    ).toThrow(/plugins extra/);
  });
});
