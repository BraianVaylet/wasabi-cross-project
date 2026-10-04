import { createHash, createPublicKey, createVerify, randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CONSUMER_TENANT_ID,
  DEV_ADMIN,
  FAKE_IDP_CLIENT_ID,
  FAKE_IDP_CLIENT_SECRET,
  fakeIdpSubjectFor,
  ORGANIZATION_TENANT_ID,
  startFakeIdp,
  type FakeIdp,
} from './fake-idp.ts';

/*
 * El IdP falso de desarrollo (F9-03, ADR-0012) se prueba como lo vería un cliente de verdad:
 * por HTTP, con el flujo authorization code + PKCE completo. Los tests contra Better Auth
 * están en `fake-idp.auth.test.ts`.
 */

const REDIRECT_URI = 'http://127.0.0.1:3000/api/auth/callback/fake-idp';
const REDIRECT_ORIGIN = 'http://127.0.0.1:3000';

function base64url(buffer: Buffer): string {
  return buffer.toString('base64url');
}

function pkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  return { verifier, challenge: base64url(createHash('sha256').update(verifier).digest()) };
}

interface IdTokenParts {
  header: { alg: string; kid: string; typ?: string };
  claims: Record<string, unknown>;
  signingInput: string;
  signature: Buffer;
}

function decodeIdToken(token: string): IdTokenParts {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) throw new Error('no es un JWT');
  return {
    header: JSON.parse(Buffer.from(header, 'base64url').toString('utf8')) as IdTokenParts['header'],
    claims: JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >,
    signingInput: `${header}.${payload}`,
    signature: Buffer.from(signature, 'base64url'),
  };
}

interface Jwks {
  keys: Record<string, string>[];
}

async function verifySignature(idp: FakeIdp, token: string, jwksPath = '/jwks'): Promise<boolean> {
  const { header, signingInput, signature } = decodeIdToken(token);
  const jwks = (await (await fetch(`${idp.origin}${jwksPath}`)).json()) as Jwks;
  const jwk = jwks.keys.find((key) => key.kid === header.kid);
  if (!jwk) return false;
  const verifier = createVerify('RSA-SHA256').update(signingInput);
  return verifier.verify(createPublicKey({ key: jwk, format: 'jwk' }), signature);
}

interface AuthorizeOptions {
  /** Prefijo de las rutas: '' para la cara genérica, '/consumers' para la de Microsoft. */
  face?: 'generic' | 'microsoft';
  clientId?: string;
  redirectUri?: string;
  state?: string;
  nonce?: string;
  challenge?: string | null;
  challengeMethod?: string;
}

function authorizeParams(options: AuthorizeOptions): URLSearchParams {
  const params = new URLSearchParams({
    client_id: options.clientId ?? FAKE_IDP_CLIENT_ID,
    redirect_uri: options.redirectUri ?? REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile email',
    state: options.state ?? 'estado-1',
    nonce: options.nonce ?? 'nonce-1',
  });
  if (options.challenge !== null) {
    params.set('code_challenge', options.challenge ?? pkcePair().challenge);
    params.set('code_challenge_method', options.challengeMethod ?? 'S256');
  }
  return params;
}

function authorizePath(face: 'generic' | 'microsoft'): string {
  return face === 'microsoft' ? '/consumers/oauth2/v2.0/authorize' : '/authorize';
}

function tokenPath(face: 'generic' | 'microsoft'): string {
  return face === 'microsoft' ? '/consumers/oauth2/v2.0/token' : '/token';
}

/** Lo que manda el navegador al apretar "Entrar": los campos ocultos y lo que se eligió. */
async function submitForm(
  idp: FakeIdp,
  face: 'generic' | 'microsoft',
  params: URLSearchParams,
  choice: Record<string, string>,
): Promise<Response> {
  const page = await fetch(`${idp.origin}${authorizePath(face)}?${params.toString()}`);
  expect(page.status).toBe(200);
  const html = await page.text();

  const hidden: Record<string, string> = {};
  for (const match of html.matchAll(/<input type="hidden" name="([^"]+)" value="([^"]*)"/g)) {
    hidden[match[1] ?? ''] = (match[2] ?? '').replaceAll('&amp;', '&');
  }

  // Como un navegador: lo que la pantalla trae marcado por defecto se manda, y "off" es la casilla
  // destildada, que no se manda.
  const fields: Record<string, string> = {
    email: 'admin@wasabicross.dev',
    name: 'Admin',
    email_verified: 'on',
    tenant: 'consumers',
    ...hidden,
    ...choice,
  };
  const sent = Object.entries(fields).filter(([, value]) => value !== 'off');

  return fetch(`${idp.origin}${authorizePath(face)}`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(sent).toString(),
  });
}

function locationOf(response: Response): URL {
  const location = response.headers.get('location');
  if (!location) throw new Error(`sin Location (status ${String(response.status)})`);
  return new URL(location);
}

async function exchange(
  idp: FakeIdp,
  face: 'generic' | 'microsoft',
  fields: Record<string, string>,
): Promise<Response> {
  return fetch(`${idp.origin}${tokenPath(face)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: FAKE_IDP_CLIENT_ID,
      client_secret: FAKE_IDP_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      ...fields,
    }).toString(),
  });
}

/** El flujo entero: elegir quién entra, canjear el code con su verifier y devolver el id_token. */
async function signIn(
  idp: FakeIdp,
  choice: Record<string, string>,
  options: { face?: 'generic' | 'microsoft'; nonce?: string } = {},
): Promise<IdTokenParts & { raw: string }> {
  const face = options.face ?? 'generic';
  const { verifier, challenge } = pkcePair();
  const params = authorizeParams({ face, challenge, nonce: options.nonce ?? 'nonce-1' });

  const approved = await submitForm(idp, face, params, { action: 'approve', ...choice });
  expect(approved.status).toBe(302);
  const code = locationOf(approved).searchParams.get('code');
  expect(code).toBeTruthy();

  const response = await exchange(idp, face, { code: code ?? '', code_verifier: verifier });
  expect(response.status).toBe(200);
  const body = (await response.json()) as { id_token: string };

  return { ...decodeIdToken(body.id_token), raw: body.id_token };
}

describe('IdP falso de desarrollo', () => {
  let idp: FakeIdp;
  let clock: number;

  beforeEach(async () => {
    clock = Date.parse('2026-10-04T12:00:00Z');
    idp = await startFakeIdp({
      port: 0,
      host: '127.0.0.1',
      allowedRedirectOrigin: REDIRECT_ORIGIN,
      now: () => new Date(clock),
    });
  });

  afterEach(async () => {
    await idp.close();
  });

  describe('descubrimiento y claves', () => {
    it('publica su discovery: issuer, endpoints, PKCE S256 y la firma RS256', async () => {
      const response = await fetch(`${idp.origin}/.well-known/openid-configuration`);
      const discovery = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(discovery).toMatchObject({
        issuer: idp.origin,
        authorization_endpoint: `${idp.origin}/authorize`,
        token_endpoint: `${idp.origin}/token`,
        jwks_uri: `${idp.origin}/jwks`,
        code_challenge_methods_supported: ['S256'],
        id_token_signing_alg_values_supported: ['RS256'],
      });
    });

    it('publica una clave pública RS256 con su kid, y nada de la privada', async () => {
      const jwks = (await (await fetch(`${idp.origin}/jwks`)).json()) as Jwks;

      expect(jwks.keys).toHaveLength(1);
      expect(jwks.keys[0]).toMatchObject({ kty: 'RSA', alg: 'RS256', use: 'sig' });
      expect(jwks.keys[0]?.kid).toBeTruthy();
      for (const secret of ['d', 'p', 'q', 'dp', 'dq', 'qi']) {
        expect(jwks.keys[0]).not.toHaveProperty(secret);
      }
    });

    it('la cara de Microsoft publica las mismas claves en su ruta', async () => {
      const generic = (await (await fetch(`${idp.origin}/jwks`)).json()) as Jwks;
      const microsoft = (await (
        await fetch(`${idp.origin}/consumers/discovery/v2.0/keys`)
      ).json()) as Jwks;

      expect(microsoft).toEqual(generic);
    });
  });

  describe('la pantalla de ingreso', () => {
    it('muestra el admin de desarrollo ya cargado y avisa que es un IdP falso', async () => {
      const response = await fetch(`${idp.origin}/authorize?${authorizeParams({}).toString()}`);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      expect(html).toContain(DEV_ADMIN.email);
      expect(html).toContain(`value="${DEV_ADMIN.name}"`);
      expect(html).toContain('IdP falso');
    });

    it('entrar sin tocar nada es entrar como el admin: un clic', async () => {
      const token = await signIn(idp, {});

      expect(token.claims).toMatchObject({ email: DEV_ADMIN.email, name: DEV_ADMIN.name });
      expect(token.claims.sub).toBe(fakeIdpSubjectFor(DEV_ADMIN.email));
    });

    it('`login_hint` cambia el email que aparece cargado', async () => {
      const params = authorizeParams({});
      params.set('login_hint', 'otra@example.com');

      const html = await (await fetch(`${idp.origin}/authorize?${params.toString()}`)).text();

      expect(html).toContain('otra@example.com');
    });

    it('escapa lo que le llega en la URL: un state armado no inyecta HTML', async () => {
      const hostile = '"><script>alert(1)</script>';
      const response = await fetch(
        `${idp.origin}/authorize?${authorizeParams({ state: hostile }).toString()}`,
      );
      const html = await response.text();

      expect(html).not.toContain('<script>alert(1)</script>');
    });
  });

  describe('el flujo authorization code con PKCE', () => {
    it('entrega un id_token firmado con el email y el nombre elegidos, y verificable con el JWKS', async () => {
      const token = await signIn(idp, { email: 'ana@example.com', name: 'Ana' });

      expect(await verifySignature(idp, token.raw)).toBe(true);
      expect(token.header.alg).toBe('RS256');
      expect(token.claims).toMatchObject({
        iss: idp.origin,
        aud: FAKE_IDP_CLIENT_ID,
        email: 'ana@example.com',
        email_verified: true,
        name: 'Ana',
        nonce: 'nonce-1',
      });
      expect(typeof token.claims.sub).toBe('string');
      expect(Number(token.claims.exp)).toBeGreaterThan(Number(token.claims.iat));
    });

    it('un id_token alterado no verifica', async () => {
      const token = await signIn(idp, { email: 'ana@example.com', name: 'Ana' });
      const [header, payload, signature] = token.raw.split('.');
      const forged = Buffer.from(
        JSON.stringify({ ...token.claims, email: 'otra@example.com' }),
      ).toString('base64url');

      expect(header && signature).toBeTruthy();
      expect(await verifySignature(idp, `${header ?? ''}.${forged}.${signature ?? ''}`)).toBe(
        false,
      );
      expect(payload).not.toBe(forged);
    });

    it('el mismo email es siempre la misma identidad, y otro email es otra', async () => {
      const first = await signIn(idp, { email: 'ana@example.com', name: 'Ana' });
      const again = await signIn(idp, { email: 'ana@example.com', name: 'Ana' });
      const other = await signIn(idp, { email: 'beto@example.com', name: 'Beto' });

      expect(again.claims.sub).toBe(first.claims.sub);
      expect(other.claims.sub).not.toBe(first.claims.sub);
    });

    it('un account_id fija la identidad aunque cambie el email', async () => {
      const first = await signIn(idp, { email: 'ana@example.com', name: 'Ana', account_id: 'x1' });
      const sameAccount = await signIn(idp, {
        email: 'ana.nueva@example.com',
        name: 'Ana',
        account_id: 'x1',
      });
      const sameEmailOtherAccount = await signIn(idp, {
        email: 'ana@example.com',
        name: 'Ana',
        account_id: 'x2',
      });

      expect(sameAccount.claims.sub).toBe(first.claims.sub);
      expect(sameEmailOtherAccount.claims.sub).not.toBe(first.claims.sub);
    });

    it('el email sale verificado por defecto; destildar la casilla lo deja sin verificar', async () => {
      const byDefault = await signIn(idp, { email: 'ana@example.com', name: 'Ana' });
      const unchecked = await signIn(idp, {
        email: 'ana@example.com',
        name: 'Ana',
        email_verified: 'off',
      });

      expect(byDefault.claims.email_verified).toBe(true);
      expect(unchecked.claims.email_verified).toBe(false);
    });

    it('con foto, manda un data URL en `picture`; sin foto, no manda nada', async () => {
      const withPhoto = await signIn(idp, { email: 'ana@example.com', name: 'Ana', photo: 'on' });
      const without = await signIn(idp, { email: 'ana@example.com', name: 'Ana' });

      expect(String(withPhoto.claims.picture)).toMatch(/^data:image\/png;base64,/);
      expect(without.claims).not.toHaveProperty('picture');
    });

    it('rechaza el canje sin code_verifier, o con uno que no es el del desafío', async () => {
      const { challenge } = pkcePair();
      const params = authorizeParams({ challenge });
      const approved = await submitForm(idp, 'generic', params, {
        action: 'approve',
        email: 'ana@example.com',
        name: 'Ana',
      });
      const code = locationOf(approved).searchParams.get('code') ?? '';

      const missing = await exchange(idp, 'generic', { code });
      const wrong = await exchange(idp, 'generic', { code, code_verifier: pkcePair().verifier });

      expect(missing.status).toBe(400);
      expect(((await missing.json()) as { error: string }).error).toBe('invalid_grant');
      expect(wrong.status).toBe(400);
      expect(((await wrong.json()) as { error: string }).error).toBe('invalid_grant');
    });

    it('un code sirve una sola vez', async () => {
      const { verifier, challenge } = pkcePair();
      const approved = await submitForm(idp, 'generic', authorizeParams({ challenge }), {
        action: 'approve',
        email: 'ana@example.com',
        name: 'Ana',
      });
      const code = locationOf(approved).searchParams.get('code') ?? '';

      const first = await exchange(idp, 'generic', { code, code_verifier: verifier });
      const second = await exchange(idp, 'generic', { code, code_verifier: verifier });

      expect(first.status).toBe(200);
      expect(second.status).toBe(400);
      expect(((await second.json()) as { error: string }).error).toBe('invalid_grant');
    });

    it('un code vence al minuto', async () => {
      const { verifier, challenge } = pkcePair();
      const approved = await submitForm(idp, 'generic', authorizeParams({ challenge }), {
        action: 'approve',
        email: 'ana@example.com',
        name: 'Ana',
      });
      const code = locationOf(approved).searchParams.get('code') ?? '';

      clock += 61_000;
      const response = await exchange(idp, 'generic', { code, code_verifier: verifier });

      expect(response.status).toBe(400);
    });

    it('rechaza el canje con otro redirect_uri que el de la autorización', async () => {
      const { verifier, challenge } = pkcePair();
      const approved = await submitForm(idp, 'generic', authorizeParams({ challenge }), {
        action: 'approve',
        email: 'ana@example.com',
        name: 'Ana',
      });
      const code = locationOf(approved).searchParams.get('code') ?? '';

      const response = await exchange(idp, 'generic', {
        code,
        code_verifier: verifier,
        redirect_uri: `${REDIRECT_ORIGIN}/api/auth/callback/otro`,
      });

      expect(response.status).toBe(400);
    });

    it('rechaza un secreto de cliente equivocado, con 401', async () => {
      const { verifier, challenge } = pkcePair();
      const approved = await submitForm(idp, 'generic', authorizeParams({ challenge }), {
        action: 'approve',
        email: 'ana@example.com',
        name: 'Ana',
      });
      const code = locationOf(approved).searchParams.get('code') ?? '';

      const response = await exchange(idp, 'generic', {
        code,
        code_verifier: verifier,
        client_secret: 'no-es-este',
      });

      expect(response.status).toBe(401);
      expect(((await response.json()) as { error: string }).error).toBe('invalid_client');
    });

    it('acepta las credenciales del cliente por Authorization: Basic', async () => {
      const { verifier, challenge } = pkcePair();
      const approved = await submitForm(idp, 'generic', authorizeParams({ challenge }), {
        action: 'approve',
        email: 'ana@example.com',
        name: 'Ana',
      });
      const code = locationOf(approved).searchParams.get('code') ?? '';
      const basic = Buffer.from(`${FAKE_IDP_CLIENT_ID}:${FAKE_IDP_CLIENT_SECRET}`).toString(
        'base64',
      );

      const response = await fetch(`${idp.origin}/token`, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          authorization: `Basic ${basic}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          code_verifier: verifier,
        }).toString(),
      });

      expect(response.status).toBe(200);
    });

    it('cancelar vuelve con access_denied y el mismo state, sin code', async () => {
      const approved = await submitForm(idp, 'generic', authorizeParams({ state: 'abc' }), {
        action: 'deny',
      });
      const location = locationOf(approved);

      expect(approved.status).toBe(302);
      expect(location.origin + location.pathname).toBe(REDIRECT_URI);
      expect(location.searchParams.get('error')).toBe('access_denied');
      expect(location.searchParams.get('state')).toBe('abc');
      expect(location.searchParams.has('code')).toBe(false);
    });
  });

  describe('claims extra: lo que un proveedor hostil podría mandar (F9-05)', () => {
    it.each(['generic', 'microsoft'] as const)(
      'en la cara %s, se suman al id_token',
      async (face) => {
        const token = await signIn(
          idp,
          { email: 'ana@example.com', name: 'Ana', extra_claims: JSON.stringify({ plan: 'pro' }) },
          { face },
        );

        expect(token.claims.plan).toBe('pro');
      },
    );

    it('no pisan los claims del propio IdP: ni el emisor, ni la audiencia, ni la identidad, ni el email', async () => {
      const token = await signIn(idp, {
        email: 'ana@example.com',
        name: 'Ana',
        extra_claims: JSON.stringify({
          iss: 'https://evil.example.com',
          aud: 'otra-app',
          sub: 'sub-falso',
          email: 'otra@example.com',
          email_verified: false,
          exp: 1,
        }),
      });

      expect(token.claims).toMatchObject({
        iss: idp.origin,
        aud: FAKE_IDP_CLIENT_ID,
        sub: fakeIdpSubjectFor('ana@example.com'),
        email: 'ana@example.com',
        email_verified: true,
      });
      expect(Number(token.claims.exp)).toBeGreaterThan(1);
    });

    it.each([
      ['un JSON roto', '{no es json'],
      ['un JSON que no es un objeto', '"texto"'],
      ['una lista', '["a"]'],
      ['null', 'null'],
      ['vacío', ''],
    ])('%s se ignora: el ingreso sale igual', async (_case, extra) => {
      const token = await signIn(idp, {
        email: 'ana@example.com',
        name: 'Ana',
        extra_claims: extra,
      });

      expect(token.claims.email).toBe('ana@example.com');
      expect(token.claims).not.toHaveProperty('plan');
    });
  });

  describe('lo que no acepta en /authorize', () => {
    it('PKCE es obligatorio: sin desafío, o con `plain`, vuelve con invalid_request', async () => {
      for (const options of [{ challenge: null }, { challengeMethod: 'plain' }]) {
        const response = await fetch(
          `${idp.origin}/authorize?${authorizeParams(options).toString()}`,
          { redirect: 'manual' },
        );
        const location = locationOf(response);

        expect(response.status).toBe(302);
        expect(location.searchParams.get('error')).toBe('invalid_request');
      }
    });

    it('un client_id desconocido no redirige: responde 400 en la propia página', async () => {
      const response = await fetch(
        `${idp.origin}/authorize?${authorizeParams({ clientId: 'otro-cliente' }).toString()}`,
        { redirect: 'manual' },
      );

      expect(response.status).toBe(400);
      expect(response.headers.has('location')).toBe(false);
    });

    it('un redirect_uri fuera de la API no redirige: no es un open redirect', async () => {
      for (const redirectUri of [
        'https://evil.example.com/api/auth/callback/fake-idp',
        `${REDIRECT_ORIGIN}/otra/ruta`,
        `${REDIRECT_ORIGIN}.evil.example.com/api/auth/callback/fake-idp`,
      ]) {
        const response = await fetch(
          `${idp.origin}/authorize?${authorizeParams({ redirectUri }).toString()}`,
          { redirect: 'manual' },
        );

        expect(response.status).toBe(400);
        expect(response.headers.has('location')).toBe(false);
      }
    });

    it('sólo entiende response_type=code', async () => {
      const params = authorizeParams({});
      params.set('response_type', 'token');

      const response = await fetch(`${idp.origin}/authorize?${params.toString()}`, {
        redirect: 'manual',
      });

      expect(locationOf(response).searchParams.get('error')).toBe('unsupported_response_type');
    });
  });

  describe('la cara de Microsoft', () => {
    it('emite un id_token con el layout de Microsoft: iss con el tid, oid, tid y el email verificado', async () => {
      const token = await signIn(
        idp,
        { email: 'ana@outlook.com', name: 'Ana', tenant: 'consumers' },
        { face: 'microsoft' },
      );

      expect(await verifySignature(idp, token.raw, '/consumers/discovery/v2.0/keys')).toBe(true);
      expect(token.claims).toMatchObject({
        iss: `${idp.origin}/${CONSUMER_TENANT_ID}/v2.0`,
        aud: FAKE_IDP_CLIENT_ID,
        tid: CONSUMER_TENANT_ID,
        email: 'ana@outlook.com',
        name: 'Ana',
        verified_primary_email: ['ana@outlook.com'],
        nonce: 'nonce-1',
      });
      expect(typeof token.claims.oid).toBe('string');
      expect(token.claims).not.toHaveProperty('email_verified');
    });

    it('sin verificar el email, no manda verified_primary_email', async () => {
      const token = await signIn(
        idp,
        { email: 'ana@outlook.com', name: 'Ana', email_verified: 'off' },
        { face: 'microsoft' },
      );

      expect(token.claims).not.toHaveProperty('verified_primary_email');
      expect(token.claims).not.toHaveProperty('email_verified');
    });

    it('una cuenta de organización lleva el tid de una organización, y su issuer', async () => {
      const token = await signIn(
        idp,
        { email: 'ana@empresa.com', name: 'Ana', tenant: 'organization' },
        { face: 'microsoft' },
      );

      expect(token.claims.tid).toBe(ORGANIZATION_TENANT_ID);
      expect(token.claims.iss).toBe(`${idp.origin}/${ORGANIZATION_TENANT_ID}/v2.0`);
    });

    it('el oid es estable por cuenta y distinto del sub de la cara genérica', async () => {
      const first = await signIn(
        idp,
        { email: 'ana@outlook.com', name: 'Ana' },
        { face: 'microsoft' },
      );
      const again = await signIn(
        idp,
        { email: 'ana@outlook.com', name: 'Ana' },
        { face: 'microsoft' },
      );
      const generic = await signIn(idp, { email: 'ana@outlook.com', name: 'Ana' });

      expect(again.claims.oid).toBe(first.claims.oid);
      expect(generic.claims).not.toHaveProperty('oid');
    });
  });
});
