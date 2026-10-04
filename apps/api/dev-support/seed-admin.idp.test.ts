import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createAuth } from '../src/modules/auth/infrastructure/better-auth.ts';
import { connectMongo, type MongoConnection } from '../src/shared/db/mongo.ts';
import { testEnv } from '../src/test/env.ts';
import { fakeIdpAuthPlugin } from './fake-idp-auth.ts';
import { DEV_ADMIN, startFakeIdp, type FakeIdp } from './fake-idp.ts';
import { signInVia } from './idp-flow.ts';
import { seedDevAdmin } from './seed-dev-admin.ts';

/*
 * El admin de desarrollo (F9-04, ADR-0012) y el IdP falso tienen que estar de acuerdo: el seed liga
 * al admin a la cuenta `fake-idp:<sub>`, y la pantalla del IdP ofrece a ese mismo admin cargado.
 * Si no coinciden, "entrar como el admin" crearía otro usuario Free en vez de abrir al Pro. Vive
 * acá y no en `src/` porque `src/` no puede importar el IdP.
 */

const BASE = 'http://127.0.0.1:3000';

describe('seed:admin + IdP falso: entrar como el admin es un clic (F9-04)', () => {
  let mongod: MongoMemoryServer;
  let mongo: MongoConnection;
  let idp: FakeIdp;
  const env = () => testEnv({ BETTER_AUTH_URL: BASE });

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    mongo = await connectMongo(testEnv({ MONGODB_URI: mongod.getUri() }));
    idp = await startFakeIdp({ port: 0, host: '127.0.0.1', allowedRedirectOrigin: BASE });
  });

  afterAll(async () => {
    await idp.close();
    await mongo.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    for (const name of ['user', 'account', 'session', 'verification']) {
      await mongo.db.collection(name).deleteMany({});
    }
  });

  function authWithIdp() {
    return createAuth({
      env: env(),
      db: mongo.db,
      client: mongo.client,
      transactions: false,
      plugins: [fakeIdpAuthPlugin(idp)],
    });
  }

  type TestAuth = ReturnType<typeof authWithIdp>;

  /** Lo que corre `scripts/seed-admin.ts`: el admin ligado a la cuenta que emite el IdP. */
  function seed(auth: TestAuth) {
    return seedDevAdmin({ auth, db: mongo.db });
  }

  /** "Entrar" sin tocar nada de la pantalla del IdP: queda el admin cargado. */
  function enterWithOneClick(auth: TestAuth) {
    return signInVia(auth, {
      base: BASE,
      webOrigin: env().WEB_ORIGIN,
      provider: 'fake-idp',
      choice: { action: 'approve' },
    });
  }

  it('el clic abre la sesión del admin sembrado, con plan Pro, y no crea otro usuario', async () => {
    const auth = authWithIdp();
    await seed(auth);
    const seeded = await mongo.db.collection('user').findOne({ email: DEV_ADMIN.email });

    const attempt = await enterWithOneClick(auth);

    expect(attempt.jar.hasSession()).toBe(true);
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: attempt.jar.header() }),
    });
    expect(session?.user.id).toBe(seeded?._id);
    expect(session?.user).toMatchObject({ email: DEV_ADMIN.email, plan: 'pro' });
    expect(await mongo.db.collection('user').countDocuments()).toBe(1);
    expect(await mongo.db.collection('account').countDocuments()).toBe(1);
  });

  it('sembrar de nuevo no rompe el clic: sigue siendo el mismo usuario', async () => {
    const auth = authWithIdp();
    await seed(auth);
    await seed(auth);

    const attempt = await enterWithOneClick(auth);

    expect(attempt.jar.hasSession()).toBe(true);
    expect(await mongo.db.collection('user').countDocuments()).toBe(1);
  });

  it('sin sembrar, el mismo clic crea un usuario Free: el seed es lo que da el plan Pro', async () => {
    const auth = authWithIdp();

    const attempt = await enterWithOneClick(auth);

    const session = await auth.api.getSession({
      headers: new Headers({ cookie: attempt.jar.header() }),
    });
    expect(session?.user).toMatchObject({ email: DEV_ADMIN.email, plan: 'free' });
  });
});
