import { oauthProvidersResponseSchema } from '@wasabi-cross/schemas';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../../app.ts';
import { composeOauth } from '../../../composition.ts';
import type { Env } from '../../../config/env.ts';
import { testEnv } from '../../../test/env.ts';

const GOOGLE = {
  GOOGLE_CLIENT_ID: 'google-client-id',
  GOOGLE_CLIENT_SECRET: 'google-client-secret',
};
const MICROSOFT = {
  MICROSOFT_CLIENT_ID: 'microsoft-client-id',
  MICROSOFT_CLIENT_SECRET: 'microsoft-client-secret',
};

describe('GET /api/v1/oauth/providers', () => {
  let app: FastifyInstance | undefined;

  async function startWith(overrides: Partial<Env>): Promise<FastifyInstance> {
    const env = testEnv(overrides);
    app = await buildApp({ env, oauth: composeOauth(env) });
    await app.ready();
    return app;
  }

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('responde sin sesión: el ingreso lo necesita antes de que haya una', async () => {
    const api = await startWith(GOOGLE);

    const response = await api.inject({ method: 'GET', url: '/api/v1/oauth/providers' });

    expect(response.statusCode).toBe(200);
  });

  it('con los dos pares de credenciales lista Google y Microsoft, en ese orden', async () => {
    const api = await startWith({ ...GOOGLE, ...MICROSOFT });

    const response = await api.inject({ method: 'GET', url: '/api/v1/oauth/providers' });

    expect(oauthProvidersResponseSchema.parse(response.json())).toEqual({
      providers: [
        { id: 'google', label: 'Google' },
        { id: 'microsoft', label: 'Microsoft' },
      ],
    });
  });

  it('con un solo par lista sólo ese proveedor', async () => {
    const api = await startWith(MICROSOFT);

    const response = await api.inject({ method: 'GET', url: '/api/v1/oauth/providers' });

    expect(response.json()).toEqual({ providers: [{ id: 'microsoft', label: 'Microsoft' }] });
  });

  it('con sólo OAUTH_DEV_IDP=on lista el IdP de desarrollo', async () => {
    const api = await startWith({ OAUTH_DEV_IDP: 'on' });

    const response = await api.inject({ method: 'GET', url: '/api/v1/oauth/providers' });

    expect(response.json()).toEqual({
      providers: [{ id: 'fake-idp', label: 'Ingreso de desarrollo' }],
    });
  });

  it('sin ningún proveedor responde la lista vacía: el front avisa que no se puede entrar', async () => {
    const api = await startWith({});

    const response = await api.inject({ method: 'GET', url: '/api/v1/oauth/providers' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ providers: [] });
  });

  it('no filtra ids de cliente ni secretos, ni en el cuerpo ni en los headers', async () => {
    const api = await startWith({ ...GOOGLE, ...MICROSOFT });

    const response = await api.inject({ method: 'GET', url: '/api/v1/oauth/providers' });
    const everything = `${response.body}\n${JSON.stringify(response.headers)}`;

    for (const value of [...Object.values(GOOGLE), ...Object.values(MICROSOFT)]) {
      expect(everything).not.toContain(value);
    }
  });

  it('está en el OpenAPI, que sale de los schemas', async () => {
    const api = await startWith(GOOGLE);

    const response = await api.inject({ method: 'GET', url: '/docs/json' });
    const paths = Object.keys(response.json<{ paths: Record<string, unknown> }>().paths);

    // El OpenAPI declara `servers: /api/v1`, así que las rutas versionadas van sin el prefijo.
    expect(paths).toContain('/oauth/providers');
  });
});
