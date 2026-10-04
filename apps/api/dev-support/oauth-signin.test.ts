import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.ts';
import type { Env } from '../src/config/env.ts';
import { createAuth } from '../src/modules/auth/infrastructure/better-auth.ts';
import { migrateUp } from '../src/shared/db/migrations.ts';
import { connectMongo, type MongoConnection } from '../src/shared/db/mongo.ts';
import { testEnv } from '../src/test/env.ts';
import { chooseAtIdp, type Choice } from './fake-idp-client.ts';
import { fakeIdpAuthPlugin, fakeIdpSocialProviders } from './fake-idp-auth.ts';
import { startFakeIdp, type FakeIdp } from './fake-idp.ts';
import { signInVia, type Attempt } from './idp-flow.ts';

/*
 * El ingreso por OAuth de punta a punta (F9-05, ADR-0012), contra el IdP falso y con la
 * configuración de producción: el proveedor `microsoft` real, armado por el mismo
 * `socialProvidersFor` que usa `startServer`, y `fake-idp` por `genericOAuth`. Va sobre un replica
 * set con las migraciones corridas, como en Atlas: los índices únicos y las transacciones cuentan.
 */

const BASE = 'http://127.0.0.1:3000';
const PROVIDERS = ['fake-idp', 'microsoft'] as const;
/** Sin depender del replica set: se usa al armar los tests, antes de que exista. */
const WEB_ORIGIN = testEnv().WEB_ORIGIN;

describe('el ingreso por OAuth (F9-05)', () => {
  let replSet: MongoMemoryReplSet;
  let mongo: MongoConnection;
  let idp: FakeIdp;
  const env = (overrides: Partial<Env> = {}) =>
    testEnv({ BETTER_AUTH_URL: BASE, MONGODB_URI: replSet.getUri(), ...overrides });

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    mongo = await connectMongo(env());
    await migrateUp(mongo.db, mongo.client);
    idp = await startFakeIdp({ port: 0, host: '127.0.0.1', allowedRedirectOrigin: BASE });
  });

  afterAll(async () => {
    await idp.close();
    await mongo.close();
    await replSet.stop();
  });

  beforeEach(async () => {
    for (const name of ['user', 'account', 'session', 'verification', 'rateLimit']) {
      await mongo.db.collection(name).deleteMany({});
    }
  });

  function authFor(overrides: Partial<Env> = {}) {
    return createAuth({
      env: env(overrides),
      db: mongo.db,
      client: mongo.client,
      plugins: [fakeIdpAuthPlugin(idp)],
      socialProviders: fakeIdpSocialProviders(idp),
    });
  }

  type TestAuth = ReturnType<typeof authFor>;

  function signIn(
    auth: TestAuth,
    provider: string,
    choice: Choice,
    extra: { mutateCallback?: (url: URL) => void; beforeCallback?: () => Promise<void> } = {},
  ): Promise<Attempt> {
    return signInVia(auth, {
      base: BASE,
      webOrigin: WEB_ORIGIN,
      provider,
      choice,
      ...extra,
    });
  }

  const ana: Choice = { action: 'approve', email: 'ana@example.com', name: 'Ana' };
  const users = () => mongo.db.collection('user');
  const accounts = () => mongo.db.collection('account');

  async function sessionUser(auth: TestAuth, attempt: Attempt) {
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: attempt.jar.header() }),
    });
    return session?.user;
  }

  describe('el alta', () => {
    it.each(PROVIDERS)(
      '%s: un email verificado y sin cuenta crea un usuario Free, con sesión por cookie y sin contraseña',
      async (provider) => {
        const auth = authFor();

        const attempt = await signIn(auth, provider, ana);

        expect(attempt.callbackStatus).toBe(302);
        expect(attempt.finalLocation).toContain('/inicio');
        expect(attempt.jar.hasSession()).toBe(true);
        expect(await sessionUser(auth, attempt)).toMatchObject({
          email: 'ana@example.com',
          name: 'Ana',
          plan: 'free',
        });

        const user = await users().findOne({ email: 'ana@example.com' });
        expect(user).not.toHaveProperty('password');
        const userAccounts = await accounts().find({ userId: user?._id }).toArray();
        expect(userAccounts).toHaveLength(1);
        expect(userAccounts[0]?.providerId).toBe(provider);
        expect(userAccounts.some((account) => account.providerId === 'credential')).toBe(false);
      },
    );

    it.each(PROVIDERS)('%s: los tokens del proveedor no quedan guardados', async (provider) => {
      const auth = authFor();

      await signIn(auth, provider, ana);
      await signIn(auth, provider, ana); // y tampoco al volver a entrar

      const account = await accounts().findOne({ providerId: provider });
      expect(account).not.toBeNull();
      for (const field of ['accessToken', 'refreshToken', 'idToken']) {
        expect(account?.[field] ?? null).toBeNull();
      }
    });

    it('el mismo accountId que vuelve es el mismo usuario; y si cambió su nombre o su foto, se actualizan', async () => {
      const auth = authFor();
      const first = await signIn(auth, 'fake-idp', { ...ana, accountId: 'cuenta-1' });
      const userId = (await sessionUser(auth, first))?.id;
      expect((await users().findOne({ _id: userId as never }))?.image ?? null).toBeNull();

      const again = await signIn(auth, 'fake-idp', {
        action: 'approve',
        email: 'ana@example.com',
        name: 'Ana María',
        accountId: 'cuenta-1',
        photo: true,
      });

      expect((await sessionUser(auth, again))?.id).toBe(userId);
      expect(await users().countDocuments()).toBe(1);
      expect(await users().findOne({ _id: userId as never })).toMatchObject({ name: 'Ana María' });
      expect(String((await users().findOne({ _id: userId as never }))?.image)).toMatch(
        /^data:image\/png;base64,/,
      );
    });

    it.each(PROVIDERS)(
      '%s: un perfil que trae plan "pro" no hace Pro al usuario: nace Free y sigue Free',
      async (provider) => {
        const auth = authFor();
        const hostile: Choice = { ...ana, extraClaims: { plan: 'pro' } };

        const first = await signIn(auth, provider, hostile);
        const again = await signIn(auth, provider, hostile);

        expect((await sessionUser(auth, first))?.plan).toBe('free');
        expect((await sessionUser(auth, again))?.plan).toBe('free');
        expect((await users().findOne({ email: 'ana@example.com' }))?.plan).toBe('free');
      },
    );

    it.each(PROVIDERS)(
      '%s: un email que el proveedor no verificó no crea usuario ni sesión',
      async (provider) => {
        const auth = authFor();

        const attempt = await signIn(auth, provider, { ...ana, emailVerified: false });

        expect(attempt.jar.hasSession()).toBe(false);
        expect(new URL(attempt.finalLocation, BASE).searchParams.has('error')).toBe(true);
        expect(await users().countDocuments()).toBe(0);
        expect(await accounts().countDocuments()).toBe(0);
      },
    );

    it('el error vuelve al /login del front, aun sin un errorCallbackURL propio', async () => {
      const auth = authFor();

      const response = await auth.handler(new Request(`${BASE}/api/auth/callback/fake-idp?code=x`));

      expect(response.status).toBe(302);
      const location = new URL(response.headers.get('location') ?? '');
      expect(location.origin + location.pathname).toBe(`${WEB_ORIGIN}/login`);
      expect(location.searchParams.get('error')).toBe('state_not_found');
    });
  });

  describe('las cuentas no se vinculan solas (spec §5.6)', () => {
    it('un email que ya tiene cuenta con otro accountId vuelve a /login con account_not_linked', async () => {
      const auth = authFor();
      await signIn(auth, 'fake-idp', { ...ana, accountId: 'cuenta-1' });

      const attempt = await signIn(auth, 'fake-idp', { ...ana, accountId: 'cuenta-2' });

      expect(attempt.jar.hasSession()).toBe(false);
      expect(new URL(attempt.finalLocation, BASE).searchParams.get('error')).toBe(
        'account_not_linked',
      );
      expect(await users().countDocuments()).toBe(1);
      expect(await accounts().countDocuments()).toBe(1);
    });

    it('lo mismo con el otro proveedor: entrar con Microsoft con el email de una cuenta de Google no entra a esa cuenta', async () => {
      const auth = authFor();
      await signIn(auth, 'fake-idp', { ...ana, name: 'Ana de siempre' });

      const attempt = await signIn(auth, 'microsoft', { ...ana, name: 'Otra Ana' });

      expect(attempt.jar.hasSession()).toBe(false);
      expect(new URL(attempt.finalLocation, BASE).searchParams.get('error')).toBe(
        'account_not_linked',
      );
      expect(await users().countDocuments()).toBe(1);
      expect(await users().findOne({ email: 'ana@example.com' })).toMatchObject({
        name: 'Ana de siempre',
      });
      expect(await accounts().countDocuments({ providerId: 'microsoft' })).toBe(0);
    });

    it('con emails distintos, dos proveedores son dos cuentas separadas', async () => {
      const auth = authFor();

      const google = await signIn(auth, 'fake-idp', ana);
      const ms = await signIn(auth, 'microsoft', {
        action: 'approve',
        email: 'ana@outlook.com',
        name: 'Ana',
      });

      expect((await sessionUser(auth, google))?.id).not.toBe((await sessionUser(auth, ms))?.id);
      expect(await users().countDocuments()).toBe(2);
    });
  });

  describe('dos callbacks a la vez', () => {
    it('del mismo accountId nuevo dejan un solo usuario y una sola cuenta', async () => {
      const auth = authFor();
      let arrived = 0;
      let release: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      // Los dos esperan al otro: los callbacks salen en el mismo instante.
      const rendezvous = async () => {
        arrived += 1;
        if (arrived === 2) release();
        await gate;
      };

      const [first, second] = await Promise.all([
        signIn(auth, 'fake-idp', ana, { beforeCallback: rendezvous }),
        signIn(auth, 'fake-idp', ana, { beforeCallback: rendezvous }),
      ]);

      expect(first.jar.hasSession() || second.jar.hasSession()).toBe(true);
      expect(await users().countDocuments({ email: 'ana@example.com' })).toBe(1);
      expect(await accounts().countDocuments({ providerId: 'fake-idp' })).toBe(1);
    });
  });

  describe('por la API de verdad (Fastify, con la política de rutas)', () => {
    async function appWith(overrides: Partial<Env> = {}) {
      const options = env(overrides);
      const auth = authFor(overrides);
      const app = await buildApp({ env: options, auth });
      await app.ready();
      return { app, auth };
    }

    const headers = { 'content-type': 'application/json', origin: WEB_ORIGIN };

    it('el recorrido completo: sign-in/social, el IdP, el callback y /me con la cookie', async () => {
      const { app } = await appWith();
      const start = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in/social',
        headers,
        payload: JSON.stringify({ provider: 'fake-idp', callbackURL: '/inicio' }),
      });
      expect(start.statusCode).toBe(200);
      const { url } = start.json<{ url: string }>();

      const atIdp = await chooseAtIdp(url, ana);
      const callback = new URL(atIdp.headers.get('location') ?? '');
      const back = await app.inject({
        method: 'GET',
        url: callback.pathname + callback.search,
        headers: { cookie: cookiesOf(start.headers['set-cookie']) },
      });
      expect(back.statusCode).toBe(302);

      const me = await app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { cookie: cookiesOf(back.headers['set-cookie']) },
      });
      expect(me.statusCode).toBe(200);
      expect(me.json()).toMatchObject({ email: 'ana@example.com', name: 'Ana', plan: 'free' });
      await app.close();
    });

    it('el sexto POST a /sign-in/social en un minuto responde 429 con WC-AUTH-429-003', async () => {
      const { app } = await appWith({ NODE_ENV: 'development', AUTH_RATE_LIMIT: 'on' });
      const post = () =>
        app.inject({
          method: 'POST',
          url: '/api/auth/sign-in/social',
          headers,
          payload: JSON.stringify({ provider: 'fake-idp', callbackURL: '/inicio' }),
        });

      const statuses: number[] = [];
      for (let attempt = 0; attempt < 6; attempt += 1) statuses.push((await post()).statusCode);
      const sixth = await post();

      expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
      expect(statuses[5]).toBe(429);
      expect(sixth.json()).toMatchObject({
        errorCode: 'WC-AUTH-429-003',
        message: 'Demasiados intentos. Esperá un minuto y probá de nuevo.',
      });
      await app.close();
    });

    it('los callbacks también tienen su límite de 5 por minuto', async () => {
      const { app } = await appWith({ NODE_ENV: 'development', AUTH_RATE_LIMIT: 'on' });
      const get = () =>
        app.inject({ method: 'GET', url: '/api/auth/callback/fake-idp?code=x&state=y' });

      const statuses: number[] = [];
      for (let attempt = 0; attempt < 6; attempt += 1) statuses.push((await get()).statusCode);

      expect(statuses.slice(0, 5)).toEqual([302, 302, 302, 302, 302]);
      expect(statuses[5]).toBe(429);
      await app.close();
    });

    it('con el límite apagado (AUTH_RATE_LIMIT=off, sólo para el E2E) no corta', async () => {
      const { app } = await appWith({ NODE_ENV: 'development', AUTH_RATE_LIMIT: 'off' });

      const statuses: number[] = [];
      for (let attempt = 0; attempt < 7; attempt += 1) {
        statuses.push(
          (
            await app.inject({
              method: 'POST',
              url: '/api/auth/sign-in/social',
              headers,
              payload: JSON.stringify({ provider: 'fake-idp', callbackURL: '/inicio' }),
            })
          ).statusCode,
        );
      }

      expect(statuses.every((status) => status === 200)).toBe(true);
      await app.close();
    });
  });
});

/** Las cookies de un `set-cookie` de Fastify, listas para el header `cookie` del request siguiente. */
function cookiesOf(setCookie: string | string[] | number | undefined): string {
  const list = Array.isArray(setCookie)
    ? setCookie
    : setCookie === undefined
      ? []
      : [String(setCookie)];
  return list.map((cookie) => cookie.split(';')[0]).join('; ');
}
