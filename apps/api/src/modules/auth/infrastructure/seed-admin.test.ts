import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedAdmin } from '../application/seed-admin.ts';
import { cookiesFrom, startTestApi, type TestHarness } from '../../../test/harness.ts';
import { createAuth } from './better-auth.ts';
import { createUserRegistrar } from './user-registrar.ts';

describe('seedAdmin — el usuario fijo con plan Max de desarrollo', () => {
  let harness: TestHarness;

  beforeAll(async () => {
    harness = await startTestApi();
  });

  afterAll(async () => {
    await harness.stop();
  });

  function registrar() {
    const auth = createAuth({
      env: harness.env,
      db: harness.mongo.db,
      client: harness.mongo.client,
    });
    return createUserRegistrar(auth);
  }

  it('crea el usuario con plan Max, con una contraseña que sirve para entrar', async () => {
    const result = await seedAdmin(registrar(), harness.mongo.db, {
      email: 'admin1@wasabicross.dev',
      password: 'una-frase-larga-y-propia',
      name: 'Admin',
    });

    expect(result).toEqual({ email: 'admin1@wasabicross.dev', created: true });

    const signIn = await harness.app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({
        email: 'admin1@wasabicross.dev',
        password: 'una-frase-larga-y-propia',
      }),
    });
    expect(signIn.statusCode).toBe(200);

    const me = await harness.app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { cookie: cookiesFrom(signIn.headers) },
    });
    expect(me.json()).toMatchObject({ plan: 'max' });
  });

  it('correrlo de nuevo no falla ni duplica: la segunda vez no crea', async () => {
    const options = {
      email: 'admin2@wasabicross.dev',
      password: 'una-frase-larga-y-propia',
      name: 'Admin',
    };

    const primera = await seedAdmin(registrar(), harness.mongo.db, options);
    const segunda = await seedAdmin(registrar(), harness.mongo.db, options);

    expect(primera).toEqual({ email: options.email, created: true });
    expect(segunda).toEqual({ email: options.email, created: false });
  });

  it('si el usuario ya existe con plan Free, lo sube a Max sin volver a registrarlo', async () => {
    const email = 'admin3@wasabicross.dev';
    await harness.app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ email, password: 'una-frase-larga-y-propia', name: 'Ya existía' }),
    });

    const result = await seedAdmin(registrar(), harness.mongo.db, {
      email,
      password: 'otra-contraseña-que-no-se-usa',
    });

    expect(result).toEqual({ email, created: false });

    const users = harness.mongo.db.collection('user');
    const document = await users.findOne({ email });
    expect(document).toMatchObject({ plan: 'max', name: 'Ya existía' });
  });
});
