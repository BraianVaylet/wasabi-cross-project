import type { BetterAuthPlugin } from 'better-auth';
import type { Db, MongoClient } from 'mongodb';
import { describe, expect, it } from 'vitest';
import { testEnv } from '../../../test/env.ts';
import { createAuth } from './better-auth.ts';

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
