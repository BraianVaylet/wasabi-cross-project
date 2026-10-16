import { PassThrough } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestApi, type TestHarness } from '../../../test/harness.ts';
import { testEnv } from '../../../test/env.ts';
import { createTestSession } from '../../../test/session.ts';
import { createAuth } from './better-auth.ts';

/*
 * Better Auth sólo con proveedores OAuth (F9-05, ADR-0012). El ingreso completo contra el IdP falso
 * —alta, vuelta, errores, el tid de Microsoft— se prueba en `dev-support/oauth-signin.test.ts`:
 * `src/` no puede importar el IdP. Acá, lo que se ve sin proveedor: qué rutas hay, qué
 * configuración se arma y qué hacen los hooks.
 */

describe('auth', () => {
  let harness: TestHarness;

  beforeAll(async () => {
    harness = await startTestApi();
  });

  afterAll(async () => {
    await harness.stop();
  });

  const post = (url: string, body: unknown = {}) =>
    harness.app.inject({
      method: 'POST',
      url,
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify(body),
    });

  describe('el email y la contraseña ya no son un camino de entrada', () => {
    it.each([
      [
        '/api/auth/sign-up/email',
        { email: 'a@example.com', password: 'una-frase-larga', name: 'A' },
      ],
      ['/api/auth/sign-in/email', { email: 'a@example.com', password: 'una-frase-larga' }],
      ['/api/auth/forget-password', { email: 'a@example.com' }],
      ['/api/auth/reset-password', { newPassword: 'otra-frase-larga', token: 'x' }],
      ['/api/auth/change-password', { newPassword: 'a', currentPassword: 'b' }],
      ['/api/auth/set-password', { newPassword: 'una-frase-larga' }],
      ['/api/auth/send-verification-email', { email: 'a@example.com' }],
    ])('POST %s responde como una ruta inexistente', async (url, body) => {
      const response = await post(url, body);

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ errorCode: 'WC-SYS-404-003' });
    });

    it('un usuario que existe no entra con una contraseña: no hay por dónde', async () => {
      const { email } = await createTestSession(harness);

      const response = await post('/api/auth/sign-in/email', {
        email,
        password: 'cualquier-contraseña-larga',
      });

      expect(response.statusCode).toBe(404);
      expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('no se crea ningún usuario con un POST a sign-up/email', async () => {
      const before = await harness.mongo.db.collection('user').countDocuments();

      await post('/api/auth/sign-up/email', {
        email: 'intruso@example.com',
        password: 'una-frase-larga-y-propia',
        name: 'Intruso',
      });

      expect(await harness.mongo.db.collection('user').countDocuments()).toBe(before);
      expect(
        await harness.mongo.db.collection('user').findOne({ email: 'intruso@example.com' }),
      ).toBeNull();
    });
  });

  describe('los endpoints de cuenta que Wasabi no usa tampoco se exponen', () => {
    it.each([
      ['POST', '/api/auth/update-user'],
      ['POST', '/api/auth/delete-user'],
      ['POST', '/api/auth/change-email'],
      ['POST', '/api/auth/link-social'],
      ['POST', '/api/auth/unlink-account'],
      ['GET', '/api/auth/list-accounts'],
      ['GET', '/api/auth/list-sessions'],
      ['POST', '/api/auth/revoke-sessions'],
    ] as const)('%s %s, aun con una sesión válida', async (method, url) => {
      const { cookie } = await createTestSession(harness);

      const response = await harness.app.inject({
        method,
        url,
        headers: { cookie, 'content-type': 'application/json' },
        ...(method === 'POST' ? { payload: '{}' } : {}),
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ errorCode: 'WC-SYS-404-003' });
    });
  });

  describe('lo que sí se expone', () => {
    it('sign-out cierra la sesión: la cookie deja de valer', async () => {
      const { cookie } = await createTestSession(harness);
      const before = await harness.app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { cookie },
      });
      expect(before.statusCode).toBe(200);

      const out = await harness.app.inject({
        method: 'POST',
        url: '/api/auth/sign-out',
        headers: { cookie, 'content-type': 'application/json', origin: harness.env.WEB_ORIGIN },
        payload: '{}',
      });
      expect(out.statusCode).toBe(200);

      const after = await harness.app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { cookie },
      });
      expect(after.statusCode).toBe(401);
    });

    it('sign-in/social con un proveedor que no está configurado responde 404 del catálogo, sin texto de Better Auth', async () => {
      const response = await post('/api/auth/sign-in/social', {
        provider: 'google',
        callbackURL: '/',
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        errorCode: 'WC-SYS-404-003',
        message: 'No encontramos lo que buscás.',
      });
    });
  });

  describe('endpoint protegido', () => {
    it('sin sesión responde 401 con WC-AUTH-401-004', async () => {
      const response = await harness.app.inject({ method: 'GET', url: '/api/v1/me' });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        errorCode: 'WC-AUTH-401-004',
        message: 'Iniciá sesión para continuar.',
      });
    });

    it('con una cookie de sesión inventada responde 401', async () => {
      const response = await harness.app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { cookie: 'better-auth.session_token=inventada' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('con sesión válida devuelve el usuario y su plan', async () => {
      const { cookie, email } = await createTestSession(harness, {
        email: 'braian@example.com',
        name: 'Braian',
      });

      const response = await harness.app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { cookie },
      });

      expect(email).toBe('braian@example.com');
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        email: 'braian@example.com',
        name: 'Braian',
        plan: 'free',
      });
    });

    it('el usuario nuevo arranca en el plan free, y el plan no se puede pedir por la API', async () => {
      const { cookie } = await createTestSession(harness);

      const response = await harness.app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { cookie },
      });
      const attempt = await post('/api/auth/update-user', { plan: 'pro' });

      expect(response.json()).toMatchObject({ plan: 'free' });
      expect(attempt.statusCode).toBe(404);
    });

    it('le asigna un ID con el prefijo del dominio', async () => {
      const { userId } = await createTestSession(harness);

      expect(userId).toMatch(/^usr_[a-z0-9]+$/);
    });
  });

  describe('configuración', () => {
    function authFor(overrides: Parameters<typeof testEnv>[0] = {}) {
      return createAuth({
        env: testEnv({ MONGODB_URI: harness.env.MONGODB_URI, ...overrides }),
        db: harness.mongo.db,
        client: harness.mongo.client,
        transactions: false,
      });
    }

    it('el email y la contraseña están apagados', () => {
      expect(authFor().options).not.toHaveProperty('emailAndPassword');
    });

    it('las cuentas no se vinculan solas: un email de otro proveedor es una cuenta aparte', () => {
      expect(authFor().options.account.accountLinking.enabled).toBe(false);
    });

    it('no guarda tokens del proveedor al volver a entrar', () => {
      expect(authFor().options.account.updateAccountOnSignIn).toBe(false);
    });

    it('los errores del callback vuelven al /login del front', () => {
      const auth = authFor({ WEB_ORIGIN: 'https://app.wasabicross.example' });

      expect(auth.options.onAPIError.errorURL).toBe('https://app.wasabicross.example/login');
    });

    it('limita el ingreso a 5 por minuto por IP (spec §13), y ya no hay reglas de email', () => {
      const rules = authFor({ NODE_ENV: 'production' }).options.rateLimit.customRules;

      expect(rules['/sign-in/social']).toEqual({ window: 60, max: 5 });
      expect(rules['/callback/*']).toEqual({ window: 60, max: 5 });
      expect(Object.keys(rules).sort()).toEqual(['/callback/*', '/sign-in/social']);
    });

    it('en producción se arma con el rate limit y sin plugins: ni de prueba ni de contraseñas', () => {
      const auth = authFor({ NODE_ENV: 'production' });

      expect(auth.options.rateLimit.enabled).toBe(true);
      expect(auth.options.plugins).toEqual([]);
    });

    it('fuera de producción, con AUTH_RATE_LIMIT=off, el límite se apaga (sólo para el E2E)', () => {
      const auth = authFor({ NODE_ENV: 'development', AUTH_RATE_LIMIT: 'off' });

      expect(auth.options.rateLimit.enabled).toBe(false);
    });

    it('en test el límite está apagado y el único plugin es testUtils, que no llama a nadie', () => {
      const auth = authFor();

      expect(auth.options.rateLimit.enabled).toBe(false);
      expect(auth.options.plugins.map((plugin) => plugin.id)).toEqual(['test-utils']);
    });

    it('con CLIENT_IP_HEADER, la IP sale de ese header y de ningún otro (F3-14)', () => {
      const auth = authFor({ CLIENT_IP_HEADER: 'x-real-ip' });

      expect(auth.options.advanced.ipAddress).toEqual({ ipAddressHeaders: ['x-real-ip'] });
    });

    it('sin CLIENT_IP_HEADER, no se toca cómo Better Auth resuelve la IP (F3-14)', () => {
      expect(authFor().options.advanced).not.toHaveProperty('ipAddress');
    });
  });

  /*
   * F3-14: el límite de ingreso con la IP que dice el edge. Se prueba contra el Better Auth real y
   * Mongo, con el límite prendido —`NODE_ENV=development`: en `test` lo apaga—. Lo que Railway
   * manda de verdad no se puede probar acá: se mira en staging (F3-12).
   */
  describe('el límite de ingreso con la IP del cliente (F3-14)', () => {
    function authConIpDe(header: string) {
      return createAuth({
        env: testEnv({
          NODE_ENV: 'development',
          MONGODB_URI: harness.env.MONGODB_URI,
          CLIENT_IP_HEADER: header,
        }),
        db: harness.mongo.db,
        client: harness.mongo.client,
        transactions: false,
        // Con stream propio el logger no levanta el transporte de pino-pretty.
        logStream: new PassThrough(),
      });
    }

    const auth = () => authConIpDe('x-real-ip');

    async function entrarDesde(headers: Record<string, string>): Promise<number> {
      const response = await auth().handler(
        new Request('http://localhost:3000/api/auth/sign-in/social', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: 'http://localhost:5173',
            ...headers,
          },
          body: JSON.stringify({ provider: 'google', callbackURL: '/' }),
        }),
      );
      return response.status;
    }

    it('cada IP tiene su propio límite: 5 pasan, la sexta no, y otra IP sigue entrando', async () => {
      const a = { 'x-real-ip': '198.51.100.1' };
      const primeras: number[] = [];
      for (let i = 0; i < 5; i++) primeras.push(await entrarDesde(a));

      expect(primeras).not.toContain(429);
      expect(await entrarDesde(a)).toBe(429);
      expect(await entrarDesde({ 'x-real-ip': '198.51.100.2' })).not.toBe(429);
    });

    it('un X-Forwarded-For distinto en cada pedido no reinicia el límite', async () => {
      const estados: number[] = [];
      for (let i = 0; i < 6; i++) {
        estados.push(
          await entrarDesde({
            'x-real-ip': '198.51.100.10',
            'x-forwarded-for': `203.0.113.${String(i + 1)}`,
          }),
        );
      }

      expect(estados.slice(0, 5)).not.toContain(429);
      expect(estados[5]).toBe(429);
    });

    it('el header es el que dice la variable, no uno fijo: otro nombre, otra IP, otro límite', async () => {
      const header = 'cf-connecting-ip';
      // `x-real-ip` es el mismo en todos los pedidos: si se mirara ése, todos caerían en un cubo.
      const llamar = async (ip: string) => {
        const response = await authConIpDe(header).handler(
          new Request('http://localhost:3000/api/auth/sign-in/social', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              origin: 'http://localhost:5173',
              [header]: ip,
              'x-real-ip': '192.0.2.1',
            },
            body: JSON.stringify({ provider: 'google', callbackURL: '/' }),
          }),
        );
        return response.status;
      };

      const delPrimero: number[] = [];
      for (let i = 0; i < 5; i++) delPrimero.push(await llamar('198.51.100.20'));

      expect(delPrimero).not.toContain(429);
      expect(await llamar('198.51.100.20')).toBe(429);
      expect(await llamar('198.51.100.21')).not.toBe(429);
    });
  });

  describe('hooks de la base: el email verificado y los tokens', () => {
    const hooks = () =>
      createAuth({
        env: harness.env,
        db: harness.mongo.db,
        client: harness.mongo.client,
        transactions: false,
      }).options.databaseHooks;

    const baseUser = {
      id: 'usr_x',
      email: 'a@example.com',
      name: 'A',
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('un usuario con el email sin verificar no se crea', async () => {
      const result = await hooks().user.create.before({ ...baseUser, emailVerified: false });

      expect(result).toBe(false);
    });

    it('un usuario con el email verificado sí', async () => {
      const result = await hooks().user.create.before({ ...baseUser, emailVerified: true });

      expect(result).not.toBe(false);
    });

    const account = {
      id: 'acc_x',
      userId: 'usr_x',
      providerId: 'google',
      accountId: 'sub-1',
      accessToken: 'ya29.secreto',
      refreshToken: '1//secreto',
      idToken: 'eyJ.secreto.firma',
      accessTokenExpiresAt: new Date(),
      refreshTokenExpiresAt: new Date(),
      scope: 'openid email profile',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it.each(['create', 'update'] as const)(
      'al %s una cuenta, descarta el access token, el refresh token y el ID token',
      async (operation) => {
        const result = await hooks().account[operation].before();

        // Better Auth mezcla el `data` del hook sobre el original: eso es lo que se guarda.
        const saved = { ...account, ...(result as { data: object }).data };
        for (const field of ['accessToken', 'refreshToken', 'idToken']) {
          expect(saved[field as keyof typeof saved]).toBeNull();
        }
        // Lo que se guarda alcanza para saber quién es: el proveedor y su id.
        expect(saved).toMatchObject({ providerId: 'google', accountId: 'sub-1', userId: 'usr_x' });
      },
    );
  });

  describe('persistencia de la sesión', () => {
    it('la sesión vive en Mongo, no en memoria del proceso', async () => {
      const { userId } = await createTestSession(harness);

      const sessions = await harness.mongo.db.collection('session').countDocuments({ userId });

      expect(sessions).toBe(1);
    });

    it('el usuario queda persistido con su email, sin contraseña', async () => {
      const { email } = await createTestSession(harness);

      const user = await harness.mongo.db.collection('user').findOne({ email });

      expect(user).not.toBeNull();
      expect(user).not.toHaveProperty('password');
    });
  });
});
