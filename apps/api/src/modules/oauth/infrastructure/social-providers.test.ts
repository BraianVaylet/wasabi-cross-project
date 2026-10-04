import { google, microsoft } from 'better-auth/social-providers';
import { describe, expect, it, vi } from 'vitest';
import { MICROSOFT_CONSUMER_TENANT_ID } from '../domain/microsoft-claims.ts';
import { guardMicrosoftUserInfo, socialProvidersFor } from './social-providers.ts';

/*
 * La configuración de Google y de Microsoft que se le da a Better Auth (F9-05, ADR-0012). Se prueba
 * contra los proveedores de verdad de Better Auth —pidiéndoles la URL de autorización—, no contra
 * una copia de lo que se espera que hagan.
 */

const GOOGLE = { GOOGLE_CLIENT_ID: 'google-id', GOOGLE_CLIENT_SECRET: 'google-secret' };
const MICROSOFT = { MICROSOFT_CLIENT_ID: 'ms-id', MICROSOFT_CLIENT_SECRET: 'ms-secret' };

function authorizationUrl(provider: { createAuthorizationURL: (data: never) => Promise<URL> }) {
  return provider.createAuthorizationURL({
    state: 'estado',
    codeVerifier: 'verifier-de-prueba-con-largo-suficiente-1234567890',
    redirectURI: 'http://localhost:3000/api/auth/callback/x',
  } as never);
}

describe('socialProvidersFor — qué proveedores arma', () => {
  it('sin credenciales no arma ninguno', () => {
    expect(socialProvidersFor({})).toEqual({});
  });

  it('arma sólo el que tiene su par completo', () => {
    expect(Object.keys(socialProvidersFor(GOOGLE))).toEqual(['google']);
    expect(Object.keys(socialProvidersFor(MICROSOFT))).toEqual(['microsoft']);
    expect(Object.keys(socialProvidersFor({ ...GOOGLE, ...MICROSOFT }))).toEqual([
      'google',
      'microsoft',
    ]);
  });

  it('un par a medias no arma nada: parseEnv ya lo rechaza, esto es la segunda red', () => {
    expect(socialProvidersFor({ GOOGLE_CLIENT_ID: 'solo-id' })).toEqual({});
    expect(socialProvidersFor({ MICROSOFT_CLIENT_SECRET: 'solo-secreto' })).toEqual({});
  });
});

describe('Google', () => {
  async function url() {
    const options = socialProvidersFor(GOOGLE).google;
    if (!options || typeof options === 'function') throw new Error('google no es un objeto');
    return authorizationUrl(google(options));
  }

  it('pide sólo openid, email y profile', async () => {
    expect((await url()).searchParams.get('scope')?.split(' ').sort()).toEqual([
      'email',
      'openid',
      'profile',
    ]);
  });

  it('no pide acceso offline: no hay refresh token que guardar', async () => {
    const params = (await url()).searchParams;

    expect(params.has('access_type')).toBe(false);
  });

  it('no arrastra permisos concedidos antes, y siempre hace elegir la cuenta', async () => {
    const params = (await url()).searchParams;

    expect(params.has('include_granted_scopes')).toBe(false);
    expect(params.get('prompt')).toBe('select_account');
  });

  it('pide PKCE y no manda un secreto en la URL', async () => {
    const params = (await url()).searchParams;

    expect(params.get('code_challenge_method')).toBe('S256');
    expect(params.has('client_secret')).toBe(false);
    expect(params.get('client_id')).toBe('google-id');
  });
});

describe('Microsoft', () => {
  function options() {
    const config = socialProvidersFor(MICROSOFT).microsoft;
    if (!config || typeof config === 'function') throw new Error('microsoft no es un objeto');
    return config;
  }

  async function url() {
    return authorizationUrl(microsoft(options()));
  }

  it('pide openid, profile, email y User.Read, y nada de offline_access', async () => {
    const scopes = (await url()).searchParams.get('scope')?.split(' ').sort();

    expect(scopes).toEqual(['User.Read', 'email', 'openid', 'profile']);
    expect(scopes).not.toContain('offline_access');
  });

  it('va al endpoint de las cuentas personales (consumers) y hace elegir la cuenta', async () => {
    const result = await url();

    expect(result.pathname).toBe('/consumers/oauth2/v2.0/authorize');
    expect(result.searchParams.get('prompt')).toBe('select_account');
  });

  it('pide la foto de 96 px y la baja de Graph', () => {
    expect(options().profilePhotoSize).toBe(96);
    expect(options().disableProfilePhoto).toBeUndefined();
  });

  it('con una authority —el IdP falso de desarrollo— la usa y apaga la foto: Graph no se puede desviar', async () => {
    const config = socialProvidersFor({
      ...MICROSOFT,
      MICROSOFT_AUTHORITY: 'http://127.0.0.1:3102',
    }).microsoft;
    if (!config || typeof config === 'function') throw new Error('microsoft no es un objeto');

    const result = await authorizationUrl(microsoft(config));

    expect(result.origin).toBe('http://127.0.0.1:3102');
    expect(config.disableProfilePhoto).toBe(true);
  });

  it('refresca nombre y foto en cada ingreso', () => {
    expect(options().overrideUserInfoOnSignIn).toBe(true);
  });
});

describe('mapProfileToUser — el nombre del proveedor, y nunca el plan', () => {
  async function mapped(provider: 'google' | 'microsoft', profile: Record<string, unknown>) {
    const config = socialProvidersFor({ ...GOOGLE, ...MICROSOFT })[provider];
    if (!config || typeof config === 'function') throw new Error('no es un objeto');
    return (await config.mapProfileToUser?.(profile as never)) ?? {};
  }

  it.each(['google', 'microsoft'] as const)('%s: usa el nombre del perfil', async (provider) => {
    expect(await mapped(provider, { name: 'Braian', email: 'b@example.com' })).toEqual({
      name: 'Braian',
    });
  });

  it.each(['google', 'microsoft'] as const)(
    '%s: sin nombre, usa la parte local del email',
    async (provider) => {
      expect(await mapped(provider, { email: 'ana.lopez@example.com' })).toEqual({
        name: 'ana.lopez',
      });
    },
  );

  it.each(['google', 'microsoft'] as const)(
    '%s: un perfil que trae plan: "pro" no lo copia al usuario',
    async (provider) => {
      const user = await mapped(provider, { name: 'Ana', email: 'a@example.com', plan: 'pro' });

      expect(user).not.toHaveProperty('plan');
      expect(Object.keys(user)).toEqual(['name']);
    },
  );
});

describe('guardMicrosoftUserInfo — el tid, el iss y el aud, que Better Auth no chequea con code', () => {
  const authority = 'https://login.microsoftonline.com';
  const clientId = 'ms-id';
  const userInfo = { user: { id: 'x', email: 'a@outlook.com', emailVerified: true }, data: {} };

  function token(claims: Record<string, unknown>) {
    const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    return { idToken: `${part({ alg: 'RS256' })}.${part(claims)}.firma` };
  }

  function consumer(overrides: Record<string, unknown> = {}) {
    return {
      tid: MICROSOFT_CONSUMER_TENANT_ID,
      iss: `${authority}/${MICROSOFT_CONSUMER_TENANT_ID}/v2.0`,
      aud: clientId,
      ...overrides,
    };
  }

  it('con el token de una cuenta personal, delega en el de Better Auth y devuelve lo que éste devuelva', async () => {
    const base = vi.fn(() => Promise.resolve(userInfo));
    const guarded = guardMicrosoftUserInfo(base as never, { authority, clientId });

    const result = await guarded(token(consumer()));

    expect(result).toBe(userInfo);
    expect(base).toHaveBeenCalledOnce();
  });

  it.each([
    ['un tid de organización', { tid: 'organizacion', iss: `${authority}/organizacion/v2.0` }],
    ['un issuer que no es el esperado', { iss: 'https://evil.example.com/x/v2.0' }],
    ['otro cliente como audiencia', { aud: 'otra-app' }],
  ])('devuelve null, sin llamar a Better Auth, con %s', async (_name, overrides) => {
    const base = vi.fn(() => Promise.resolve(userInfo));
    const guarded = guardMicrosoftUserInfo(base as never, { authority, clientId });

    expect(await guarded(token(consumer(overrides)))).toBeNull();
    expect(base).not.toHaveBeenCalled();
  });

  it('devuelve null si no hay ID token, o no es un JWT', async () => {
    const base = vi.fn(() => Promise.resolve(userInfo));
    const guarded = guardMicrosoftUserInfo(base as never, { authority, clientId });

    expect(await guarded({})).toBeNull();
    expect(await guarded({ idToken: 'esto-no-es-un-jwt' })).toBeNull();
    expect(base).not.toHaveBeenCalled();
  });
});
