import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createAuth } from '../src/modules/auth/infrastructure/better-auth.ts';
import { connectMongo, type MongoConnection } from '../src/shared/db/mongo.ts';
import { testEnv } from '../src/test/env.ts';
import { chooseAtIdp, type Choice } from './fake-idp-client.ts';
import { startFakeIdp, type FakeIdp } from './fake-idp.ts';
import { fakeIdpAuthPlugin, fakeIdpSocialProviders } from './fake-idp-auth.ts';
import { Jar, signInVia as runFlow, type Attempt } from './idp-flow.ts';

/*
 * El IdP falso contra Better Auth de verdad (F9-03): `createAuth` con el plugin inyectado, y el
 * proveedor `microsoft` real apuntando a la cara de Microsoft. Es el mismo camino que recorrerá el
 * navegador: /sign-in/social → pantalla del IdP → /callback/<id> → cookie de sesión.
 */

const BASE = 'http://127.0.0.1:3000';

describe('el IdP falso con Better Auth (F9-03)', () => {
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

  function authWith(extra: { microsoft?: boolean; plugin?: boolean }) {
    return createAuth({
      env: env(),
      db: mongo.db,
      client: mongo.client,
      transactions: false,
      ...(extra.plugin ? { plugins: [fakeIdpAuthPlugin(idp)] } : {}),
      ...(extra.microsoft ? { socialProviders: fakeIdpSocialProviders(idp) } : {}),
    });
  }

  type TestAuth = ReturnType<typeof authWith>;

  /** El recorrido compartido, con la API y el front de este archivo. */
  function signInVia(
    auth: TestAuth,
    provider: string,
    choice: Choice,
    mutateCallback?: (url: URL) => void,
  ): Promise<Attempt> {
    return runFlow(auth, {
      base: BASE,
      webOrigin: env().WEB_ORIGIN,
      provider,
      choice,
      ...(mutateCallback ? { mutateCallback } : {}),
    });
  }

  async function countUsers(): Promise<number> {
    return mongo.db.collection('user').countDocuments();
  }

  describe('proveedor genérico `fake-idp`, registrado por inyección', () => {
    it('entra por /sign-in/social y /callback/fake-idp, y deja una sesión con el email y el nombre elegidos', async () => {
      const auth = authWith({ plugin: true });

      const attempt = await signInVia(auth, 'fake-idp', {
        action: 'approve',
        email: 'ana@example.com',
        name: 'Ana',
      });

      expect(attempt.callbackStatus).toBe(302);
      expect(attempt.finalLocation).toContain('/inicio');
      expect(attempt.jar.hasSession()).toBe(true);

      const session = await auth.api.getSession({
        headers: new Headers({ cookie: attempt.jar.header() }),
      });
      expect(session?.user).toMatchObject({ email: 'ana@example.com', name: 'Ana' });
    });

    it('guarda la cuenta con el proveedor y el id que da el IdP', async () => {
      const auth = authWith({ plugin: true });

      await signInVia(auth, 'fake-idp', {
        action: 'approve',
        email: 'ana@example.com',
        name: 'Ana',
      });

      const account = await mongo.db.collection('account').findOne({ providerId: 'fake-idp' });
      expect(account?.accountId).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('la misma persona que vuelve es el mismo usuario, no uno nuevo', async () => {
      const auth = authWith({ plugin: true });
      const choice: Choice = { action: 'approve', email: 'ana@example.com', name: 'Ana' };

      await signInVia(auth, 'fake-idp', choice);
      const second = await signInVia(auth, 'fake-idp', choice);

      expect(second.jar.hasSession()).toBe(true);
      expect(await countUsers()).toBe(1);
      expect(await mongo.db.collection('account').countDocuments()).toBe(1);
    });

    it('otro email es otro usuario', async () => {
      const auth = authWith({ plugin: true });

      await signInVia(auth, 'fake-idp', {
        action: 'approve',
        email: 'ana@example.com',
        name: 'Ana',
      });
      await signInVia(auth, 'fake-idp', {
        action: 'approve',
        email: 'beto@example.com',
        name: 'Beto',
      });

      expect(await countUsers()).toBe(2);
    });

    it('cancelar en el IdP vuelve a /login con access_denied, sin sesión y sin usuario', async () => {
      const auth = authWith({ plugin: true });

      const attempt = await signInVia(auth, 'fake-idp', { action: 'deny' });

      expect(attempt.finalLocation).toContain('/login');
      expect(new URL(attempt.finalLocation, BASE).searchParams.get('error')).toBe('access_denied');
      expect(attempt.jar.hasSession()).toBe(false);
      expect(await countUsers()).toBe(0);
    });

    it('un state alterado no deja entrar', async () => {
      const auth = authWith({ plugin: true });

      const attempt = await signInVia(
        auth,
        'fake-idp',
        { action: 'approve', email: 'ana@example.com', name: 'Ana' },
        (callback) => {
          callback.searchParams.set('state', 'otro-state');
        },
      );

      expect(attempt.jar.hasSession()).toBe(false);
      expect(new URL(attempt.finalLocation, BASE).searchParams.has('error')).toBe(true);
      expect(await countUsers()).toBe(0);
    });

    it('el callback sin la cookie de state no deja entrar', async () => {
      const auth = authWith({ plugin: true });
      const start = await auth.handler(
        new Request(`${BASE}/api/auth/sign-in/social`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: env().WEB_ORIGIN },
          body: JSON.stringify({ provider: 'fake-idp', callbackURL: '/inicio' }),
        }),
      );
      const { url } = (await start.json()) as { url: string };
      const atIdp = await chooseAtIdp(url, {
        action: 'approve',
        email: 'ana@example.com',
        name: 'Ana',
      });

      // Sin las cookies del primer paso, como si el callback llegara desde otro navegador.
      const back = await auth.handler(new Request(atIdp.headers.get('location') ?? ''));
      const jar = new Jar();
      jar.absorb(back);

      expect(jar.hasSession()).toBe(false);
      expect(await countUsers()).toBe(0);
    });

    it('un callback repetido no vuelve a entrar: el code ya se usó', async () => {
      const auth = authWith({ plugin: true });
      const first = await signInVia(auth, 'fake-idp', {
        action: 'approve',
        email: 'ana@example.com',
        name: 'Ana',
      });
      expect(first.jar.hasSession()).toBe(true);

      // Un navegador nuevo, con la misma URL de callback pero sin sesión ni state propios.
      const replay = await auth.handler(new Request(first.callbackUrl));
      const jar = new Jar();
      jar.absorb(replay);

      expect(jar.hasSession()).toBe(false);
    });
  });

  describe('el proveedor `microsoft` real, apuntado a la cara de Microsoft', () => {
    it('entra con una cuenta personal y la identidad es el oid, no el email', async () => {
      const auth = authWith({ microsoft: true });

      const attempt = await signInVia(auth, 'microsoft', {
        action: 'approve',
        email: 'ana@outlook.com',
        name: 'Ana',
      });

      expect(attempt.jar.hasSession()).toBe(true);
      const account = await mongo.db.collection('account').findOne({ providerId: 'microsoft' });
      expect(account?.accountId).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('el mismo oid con otro email sigue siendo la misma cuenta: no se identifica por email', async () => {
      const auth = authWith({ microsoft: true });

      await signInVia(auth, 'microsoft', {
        action: 'approve',
        email: 'ana@outlook.com',
        name: 'Ana',
        accountId: 'cuenta-1',
      });
      const second = await signInVia(auth, 'microsoft', {
        action: 'approve',
        email: 'ana@outlook.com',
        name: 'Ana',
        accountId: 'cuenta-1',
      });

      expect(second.jar.hasSession()).toBe(true);
      expect(await mongo.db.collection('account').countDocuments({ providerId: 'microsoft' })).toBe(
        1,
      );
    });

    it('marca el email como verificado sólo si Microsoft lo trae en verified_primary_email', async () => {
      const auth = authWith({ microsoft: true });

      await signInVia(auth, 'microsoft', {
        action: 'approve',
        email: 'ana@outlook.com',
        name: 'Ana',
      });

      const user = await mongo.db.collection('user').findOne({ email: 'ana@outlook.com' });
      expect(user?.emailVerified).toBe(true);
    });

    it('sin verified_primary_email, Better Auth no da el email por verificado y no se crea el usuario (F9-05)', async () => {
      const auth = authWith({ microsoft: true });

      const attempt = await signInVia(auth, 'microsoft', {
        action: 'approve',
        email: 'beto@outlook.com',
        name: 'Beto',
        emailVerified: false,
      });

      expect(attempt.jar.hasSession()).toBe(false);
      expect(new URL(attempt.finalLocation, BASE).searchParams.has('error')).toBe(true);
      expect(await countUsers()).toBe(0);
    });

    it('rechaza una cuenta de trabajo o escuela aunque el token llegue por el endpoint consumers: el tid lo chequea Wasabi', async () => {
      const auth = authWith({ microsoft: true });

      const attempt = await signInVia(auth, 'microsoft', {
        action: 'approve',
        email: 'ana@empresa.com',
        name: 'Ana',
        tenant: 'organization',
      });

      expect(attempt.jar.hasSession()).toBe(false);
      expect(new URL(attempt.finalLocation, BASE).searchParams.get('error')).toBe(
        'unable_to_get_user_info',
      );
      expect(await countUsers()).toBe(0);
      expect(await mongo.db.collection('account').countDocuments()).toBe(0);
    });

    it('cancelar vuelve con access_denied', async () => {
      const auth = authWith({ microsoft: true });

      const attempt = await signInVia(auth, 'microsoft', { action: 'deny' });

      expect(new URL(attempt.finalLocation, BASE).searchParams.get('error')).toBe('access_denied');
      expect(attempt.jar.hasSession()).toBe(false);
    });
  });
});
