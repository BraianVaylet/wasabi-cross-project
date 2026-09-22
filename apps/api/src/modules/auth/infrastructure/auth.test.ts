import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cookiesFrom, startTestApi, type TestHarness } from '../../../test/harness.ts';
import { testEnv } from '../../../test/env.ts';
import { createAuth } from './better-auth.ts';

const EMAIL = 'braian@example.com';
const PASSWORD = 'una-frase-larga-y-propia';

describe('auth', () => {
  let harness: TestHarness;

  beforeAll(async () => {
    harness = await startTestApi();
  });

  afterAll(async () => {
    await harness.stop();
  });

  const signUp = (body: Record<string, unknown>) =>
    harness.app.inject({
      method: 'POST',
      url: '/api/auth/sign-up/email',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify(body),
    });

  const signIn = (body: Record<string, unknown>) =>
    harness.app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify(body),
    });

  describe('registro', () => {
    it('crea el usuario y lo deja logueado', async () => {
      const response = await signUp({ email: EMAIL, password: PASSWORD, name: 'Braian' });

      expect(response.statusCode).toBe(200);
      expect(cookiesFrom(response.headers)).not.toBe('');
    });

    it('el usuario nuevo arranca en el plan free', async () => {
      const signUpResponse = await signUp({
        email: 'free@example.com',
        password: PASSWORD,
        name: 'Free',
      });

      const me = await harness.app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { cookie: cookiesFrom(signUpResponse.headers) },
      });

      expect(me.json()).toMatchObject({ email: 'free@example.com', plan: 'free' });
    });

    it('no deja auto-asignarse el plan max desde el registro', async () => {
      const signUpResponse = await signUp({
        email: 'vivo@example.com',
        password: PASSWORD,
        name: 'Vivo',
        plan: 'max',
      });

      const me = await harness.app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { cookie: cookiesFrom(signUpResponse.headers) },
      });

      expect(me.json()).toMatchObject({ plan: 'free' });
    });

    it('rechaza una contraseña más corta que el mínimo, y dice por qué', async () => {
      const response = await signUp({ email: 'corta@example.com', password: 'corta', name: 'C' });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.json()).toMatchObject({ errorCode: 'WC-SYS-400-002' });
      expect(response.json()).toHaveProperty('requestId');
    });

    it('le asigna un ID con el prefijo del dominio', async () => {
      const signUpResponse = await signUp({
        email: 'prefijo@example.com',
        password: PASSWORD,
        name: 'Prefijo',
      });

      const me = await harness.app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { cookie: cookiesFrom(signUpResponse.headers) },
      });

      expect(me.json<{ id: string }>().id).toMatch(/^usr_/);
    });
  });

  describe('login', () => {
    it('con credenciales válidas devuelve sesión', async () => {
      const response = await signIn({ email: EMAIL, password: PASSWORD });

      expect(response.statusCode).toBe(200);
      expect(cookiesFrom(response.headers)).not.toBe('');
    });

    it('con contraseña incorrecta responde WC-AUTH-401-001', async () => {
      const response = await signIn({ email: EMAIL, password: 'no-es-la-contraseña' });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        errorCode: 'WC-AUTH-401-001',
        message: 'Email o contraseña incorrectos.',
      });
    });

    it('no revela si el email existe: misma respuesta para email inexistente', async () => {
      const conEmailReal = await signIn({ email: EMAIL, password: 'no-es-la-contraseña' });
      const conEmailInventado = await signIn({
        email: 'no-existe@example.com',
        password: 'no-es-la-contraseña',
      });

      expect(conEmailInventado.statusCode).toBe(conEmailReal.statusCode);
      expect(conEmailInventado.json()).toMatchObject({
        errorCode: 'WC-AUTH-401-001',
        message: 'Email o contraseña incorrectos.',
      });
    });

    it('el error trae requestId para poder rastrearlo en los logs', async () => {
      const response = await signIn({ email: EMAIL, password: 'mal' });

      expect(response.json()).toHaveProperty('requestId');
    });

    it('nunca devuelve el hash de la contraseña', async () => {
      const response = await signIn({ email: EMAIL, password: PASSWORD });

      expect(response.body).not.toContain('password');
      expect(response.body).not.toContain('hash');
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

    it('con sesión válida devuelve el usuario', async () => {
      const signInResponse = await signIn({ email: EMAIL, password: PASSWORD });

      const response = await harness.app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { cookie: cookiesFrom(signInResponse.headers) },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ email: EMAIL, name: 'Braian', plan: 'free' });
    });
  });

  describe('configuración', () => {
    it('fuera de test se arma con el chequeo de contraseñas filtradas y el rate limit', () => {
      const auth = createAuth({
        env: testEnv({ NODE_ENV: 'production', MONGODB_URI: harness.env.MONGODB_URI }),
        db: harness.mongo.db,
        client: harness.mongo.client,
        transactions: false,
      });

      expect(auth.options.rateLimit.enabled).toBe(true);
      expect(auth.options.plugins).toHaveLength(1);
    });

    it('fuera de producción, con AUTH_RATE_LIMIT=off, el límite se apaga (sólo para el E2E)', () => {
      const auth = createAuth({
        env: testEnv({
          NODE_ENV: 'development',
          AUTH_RATE_LIMIT: 'off',
          MONGODB_URI: harness.env.MONGODB_URI,
        }),
        db: harness.mongo.db,
        client: harness.mongo.client,
        transactions: false,
      });

      expect(auth.options.rateLimit.enabled).toBe(false);
    });

    it('en test el chequeo contra listas filtradas está apagado: no depende de una API externa', () => {
      const auth = createAuth({
        env: harness.env,
        db: harness.mongo.db,
        client: harness.mongo.client,
        transactions: false,
      });

      expect(auth.options.rateLimit.enabled).toBe(false);
      expect(auth.options.plugins).toHaveLength(0);
    });
  });

  describe('persistencia de la sesión', () => {
    it('la sesión vive en Mongo, no en memoria del proceso', async () => {
      const signInResponse = await signIn({ email: EMAIL, password: PASSWORD });
      const sessions = await harness.mongo.db.collection('session').countDocuments();

      expect(cookiesFrom(signInResponse.headers)).not.toBe('');
      expect(sessions).toBeGreaterThan(0);
    });

    it('el usuario queda persistido con su email', async () => {
      const user = await harness.mongo.db.collection('user').findOne({ email: EMAIL });

      expect(user).not.toBeNull();
    });
  });
});
