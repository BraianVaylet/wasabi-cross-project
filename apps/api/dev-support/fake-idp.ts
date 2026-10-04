import type { AddressInfo } from 'node:net';
import {
  createHash,
  createSign,
  generateKeyPairSync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';

/*
 * El IdP falso de desarrollo (F9-03, ADR-0012): un proveedor OpenID Connect mínimo que reemplaza a
 * Google y a Microsoft donde no hay credenciales de verdad —el desarrollo local y el E2E—.
 *
 * ⚠️ En producción sería un bypass de la autenticación: acepta a cualquiera. Por eso vive acá,
 * fuera de `src/` (el build de la API sólo compila `src/`), `src/` nunca lo importa, y `parseEnv`
 * se niega a arrancar con `OAUTH_DEV_IDP=on` y `NODE_ENV=production`.
 *
 * Habla el flujo authorization code con PKCE (S256, obligatorio) por dos caras que comparten
 * claves, códigos y pantalla:
 *
 *  - **Genérica**: `/.well-known/openid-configuration`, `/authorize`, `/token` y `/jwks`. Better
 *    Auth la registra con `genericOAuth` como el proveedor `fake-idp`.
 *  - **Microsoft**: `/<tenant>/oauth2/v2.0/authorize`, `/token` y `/<tenant>/discovery/v2.0/keys`,
 *    con el `iss` de Microsoft (`<authority>/<tid>/v2.0`) y los claims `oid`, `tid` y
 *    `verified_primary_email`. Apuntando `MICROSOFT_AUTHORITY` acá, el proveedor `microsoft` real
 *    de Better Auth corre contra este servidor.
 */

export const FAKE_IDP_CLIENT_ID = 'wasabi-dev-idp';
export const FAKE_IDP_CLIENT_SECRET = 'wasabi-dev-idp-secret';

/** El tenant fijo de Microsoft para las cuentas personales (Outlook, Hotmail, Live). */
export const CONSUMER_TENANT_ID = '9188040d-6c67-4c5b-b112-36a304b66dad';
/** Un tenant cualquiera de trabajo o escuela: sirve para probar que se rechaza. */
export const ORGANIZATION_TENANT_ID = '5d2f1c0e-7b1a-4c3e-9a55-0f6e8d3b7a21';

const CODE_TTL_MS = 60_000;
const TOKEN_TTL_SECONDS = 3600;
const REDIRECT_PATH_PREFIX = '/api/auth/callback/';

/** Un PNG de 1×1 píxel: alcanza para probar que la foto viaja y se muestra. */
const PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==';

type Face = 'generic' | 'microsoft';

export interface FakeIdpOptions {
  port: number;
  host: string;
  /** El origen de la API (`BETTER_AUTH_URL`): el único al que se le devuelve un code. */
  allowedRedirectOrigin: string;
  /** Quién aparece cargado en la pantalla de ingreso. */
  defaultUser?: { email: string; name: string };
  /** El reloj, inyectable para probar el vencimiento del code. */
  now?: () => Date;
}

export interface FakeIdp {
  /** Dónde escucha, p. ej. `http://127.0.0.1:3102`: es el issuer y la `authority` de Microsoft. */
  origin: string;
  close: () => Promise<void>;
}

interface Chosen {
  email: string;
  name: string;
  emailVerified: boolean;
  photo: boolean;
  accountId: string;
  tenant: 'consumers' | 'organization';
}

interface AuthorizeRequest {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  face: Face;
}

interface CodeRecord extends AuthorizeRequest {
  chosen: Chosen;
  expiresAt: number;
}

type Validation =
  | { kind: 'fatal'; message: string }
  | { kind: 'redirect-error'; redirectUri: string; state: string; error: string }
  | { kind: 'ok'; request: AuthorizeRequest };

function strings(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

function sha256(input: string): Buffer {
  return createHash('sha256').update(input).digest();
}

function sameSecret(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

/** Un UUID estable derivado de un texto: la misma cuenta es siempre el mismo `sub` y el mismo `oid`. */
function uuidFrom(label: string): string {
  const hex = sha256(label).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isAllowedRedirect(uri: string, allowedOrigin: string): boolean {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  return (
    url.origin === allowedOrigin &&
    url.pathname.startsWith(REDIRECT_PATH_PREFIX) &&
    url.hash === '' &&
    url.username === '' &&
    url.password === ''
  );
}

function withParams(uri: string, params: Record<string, string>): string {
  const url = new URL(uri);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

export async function startFakeIdp(options: FakeIdpOptions): Promise<FakeIdp> {
  const now = options.now ?? (() => new Date());
  const defaultUser = options.defaultUser ?? { email: 'admin@wasabicross.dev', name: 'Admin' };
  const allowedOrigin = new URL(options.allowedRedirectOrigin).origin;

  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const kid = randomBytes(8).toString('hex');
  const jwks = {
    keys: [{ ...publicKey.export({ format: 'jwk' }), kid, alg: 'RS256', use: 'sig' }],
  };

  const codes = new Map<string, CodeRecord>();
  let origin = '';

  const app = Fastify({ logger: false });

  app.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_request, body, done) => {
      done(null, Object.fromEntries(new URLSearchParams(String(body))));
    },
  );

  function validateAuthorize(params: Record<string, string>, face: Face): Validation {
    if (params.client_id !== FAKE_IDP_CLIENT_ID) {
      return { kind: 'fatal', message: 'client_id desconocido' };
    }
    const redirectUri = params.redirect_uri ?? '';
    if (!isAllowedRedirect(redirectUri, allowedOrigin)) {
      return {
        kind: 'fatal',
        message: 'redirect_uri no permitido: tiene que ser un callback de la API',
      };
    }

    const state = params.state ?? '';
    if (params.response_type !== 'code') {
      return { kind: 'redirect-error', redirectUri, state, error: 'unsupported_response_type' };
    }
    // PKCE no es opcional: una API que lo olvidara no entraría en desarrollo y se enteraría acá.
    if (!params.code_challenge || params.code_challenge_method !== 'S256') {
      return { kind: 'redirect-error', redirectUri, state, error: 'invalid_request' };
    }

    return {
      kind: 'ok',
      request: {
        clientId: params.client_id,
        redirectUri,
        scope: params.scope ?? 'openid',
        state,
        nonce: params.nonce ?? '',
        codeChallenge: params.code_challenge,
        face,
      },
    };
  }

  function renderPage(
    request: AuthorizeRequest,
    action: string,
    loginHint: string | undefined,
  ): string {
    const hidden: Record<string, string> = {
      client_id: request.clientId,
      redirect_uri: request.redirectUri,
      response_type: 'code',
      scope: request.scope,
      state: request.state,
      nonce: request.nonce,
      code_challenge: request.codeChallenge,
      code_challenge_method: 'S256',
    };
    const hiddenInputs = Object.entries(hidden)
      .map(
        ([key, value]) =>
          `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}">`,
      )
      .join('\n      ');

    return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Ingreso de desarrollo</title>
    <style>
      body { font-family: system-ui, sans-serif; background: #0f041c; color: #f3eefb; margin: 0; }
      main { max-width: 28rem; margin: 3rem auto; padding: 0 1rem; }
      .aviso { border: 2px solid #c8f542; padding: .75rem 1rem; margin-bottom: 1.5rem; }
      label { display: block; margin: 1rem 0 .25rem; }
      input[type=email], input[type=text], select { width: 100%; padding: .5rem; box-sizing: border-box; }
      details { margin: 1rem 0; }
      button { padding: .6rem 1.2rem; font-size: 1rem; cursor: pointer; margin-right: .5rem; }
    </style>
  </head>
  <body>
    <main>
      <h1>Ingreso de desarrollo</h1>
      <p class="aviso"><strong>IdP falso.</strong> Esto sólo existe en desarrollo y en los tests: en producción no está. Elegí quién entra.</p>
      <form method="post" action="${escapeHtml(action)}">
      ${hiddenInputs}
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required value="${escapeHtml(loginHint ?? defaultUser.email)}">
      <label for="name">Nombre</label>
      <input id="name" name="name" type="text" required value="${escapeHtml(defaultUser.name)}">
      <details>
        <summary>Más opciones</summary>
        <label><input type="checkbox" name="email_verified" checked> Email verificado por el proveedor</label>
        <label><input type="checkbox" name="photo"> Con foto</label>
        <label for="tenant">Cuenta de Microsoft (sólo en su cara)</label>
        <select id="tenant" name="tenant">
          <option value="consumers">Personal (consumers)</option>
          <option value="organization">De trabajo o escuela</option>
        </select>
        <label for="account_id">Id de la cuenta (opcional: fija la identidad aunque cambie el email)</label>
        <input id="account_id" name="account_id" type="text">
      </details>
      <button type="submit" name="action" value="approve">Entrar</button>
      <button type="submit" name="action" value="deny">Cancelar</button>
      </form>
    </main>
  </body>
</html>
`;
  }

  function authorizeGet(face: Face) {
    return (request: FastifyRequest, reply: FastifyReply): FastifyReply => {
      const params = strings(request.query);
      const result = validateAuthorize(params, face);
      void reply.header('cache-control', 'no-store');

      if (result.kind === 'fatal') return reply.code(400).type('text/plain').send(result.message);
      if (result.kind === 'redirect-error') {
        return reply.redirect(
          withParams(result.redirectUri, { error: result.error, state: result.state }),
        );
      }
      return reply
        .type('text/html; charset=utf-8')
        .send(
          renderPage(result.request, request.url.split('?')[0] ?? '/authorize', params.login_hint),
        );
    };
  }

  function authorizePost(face: Face) {
    return (request: FastifyRequest, reply: FastifyReply): FastifyReply => {
      const body = strings(request.body);
      const result = validateAuthorize(body, face);
      void reply.header('cache-control', 'no-store');

      if (result.kind === 'fatal') return reply.code(400).type('text/plain').send(result.message);
      if (result.kind === 'redirect-error') {
        return reply.redirect(
          withParams(result.redirectUri, { error: result.error, state: result.state }),
        );
      }

      const { request: authorize } = result;
      if (body.action === 'deny') {
        return reply.redirect(
          withParams(authorize.redirectUri, { error: 'access_denied', state: authorize.state }),
        );
      }

      const email = (body.email ?? '').trim();
      if (!email) return reply.code(400).type('text/plain').send('Falta el email');

      const chosen: Chosen = {
        email,
        name: (body.name ?? '').trim() || email,
        // Una casilla destildada no viaja en el form: ausente es "no".
        emailVerified: body.email_verified !== undefined,
        photo: body.photo !== undefined,
        accountId: (body.account_id ?? '').trim() || email,
        tenant: body.tenant === 'organization' ? 'organization' : 'consumers',
      };

      const code = randomBytes(24).toString('base64url');
      codes.set(code, { ...authorize, chosen, expiresAt: now().getTime() + CODE_TTL_MS });

      return reply.redirect(withParams(authorize.redirectUri, { code, state: authorize.state }));
    };
  }

  function clientCredentials(
    request: FastifyRequest,
    body: Record<string, string>,
  ): { id: string; secret: string } {
    const header = request.headers.authorization;
    if (header?.startsWith('Basic ')) {
      const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
      const separator = decoded.indexOf(':');
      if (separator >= 0) {
        return {
          id: decodeURIComponent(decoded.slice(0, separator)),
          secret: decodeURIComponent(decoded.slice(separator + 1)),
        };
      }
    }
    return { id: body.client_id ?? '', secret: body.client_secret ?? '' };
  }

  function signJwt(claims: Record<string, unknown>): string {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid })).toString(
      'base64url',
    );
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signature = createSign('RSA-SHA256')
      .update(`${header}.${payload}`)
      .sign(privateKey)
      .toString('base64url');
    return `${header}.${payload}.${signature}`;
  }

  function idTokenFor(record: CodeRecord): string {
    const issuedAt = Math.floor(now().getTime() / 1000);
    const { chosen } = record;
    const common = {
      aud: record.clientId,
      iat: issuedAt,
      exp: issuedAt + TOKEN_TTL_SECONDS,
      ...(record.nonce ? { nonce: record.nonce } : {}),
      email: chosen.email,
      name: chosen.name,
    };

    if (record.face === 'microsoft') {
      const tid = chosen.tenant === 'organization' ? ORGANIZATION_TENANT_ID : CONSUMER_TENANT_ID;
      return signJwt({
        ...common,
        iss: `${origin}/${tid}/v2.0`,
        sub: uuidFrom(`sub:${chosen.accountId}`),
        oid: uuidFrom(`oid:${chosen.accountId}`),
        tid,
        nbf: issuedAt,
        ver: '2.0',
        preferred_username: chosen.email,
        // Como Microsoft: no hay `email_verified`; el email verificado va en `verified_primary_email`.
        ...(chosen.emailVerified ? { verified_primary_email: [chosen.email] } : {}),
      });
    }

    return signJwt({
      ...common,
      iss: origin,
      sub: uuidFrom(`sub:${chosen.accountId}`),
      email_verified: chosen.emailVerified,
      ...(chosen.photo ? { picture: `data:image/png;base64,${PIXEL_PNG}` } : {}),
    });
  }

  function token(request: FastifyRequest, reply: FastifyReply): FastifyReply {
    const body = strings(request.body);
    void reply.header('cache-control', 'no-store').header('pragma', 'no-cache');

    if (body.grant_type !== 'authorization_code') {
      return reply.code(400).send({ error: 'unsupported_grant_type' });
    }

    const credentials = clientCredentials(request, body);
    if (
      !sameSecret(credentials.id, FAKE_IDP_CLIENT_ID) ||
      !sameSecret(credentials.secret, FAKE_IDP_CLIENT_SECRET)
    ) {
      return reply.code(401).send({ error: 'invalid_client' });
    }

    // Se descarta al leerlo: un code sirve una sola vez aunque el canje falle después.
    const record = codes.get(body.code ?? '');
    codes.delete(body.code ?? '');

    if (!record || record.expiresAt < now().getTime()) {
      return reply.code(400).send({ error: 'invalid_grant' });
    }
    if (record.redirectUri !== body.redirect_uri || record.clientId !== credentials.id) {
      return reply.code(400).send({ error: 'invalid_grant' });
    }
    const verifier = body.code_verifier;
    const challenge = verifier ? createHash('sha256').update(verifier).digest('base64url') : '';
    if (!verifier || !sameSecret(challenge, record.codeChallenge)) {
      return reply.code(400).send({ error: 'invalid_grant' });
    }

    return reply.send({
      access_token: randomBytes(24).toString('base64url'),
      token_type: 'Bearer',
      expires_in: TOKEN_TTL_SECONDS,
      scope: record.scope,
      id_token: idTokenFor(record),
    });
  }

  app.get('/.well-known/openid-configuration', () => ({
    issuer: origin,
    authorization_endpoint: `${origin}/authorize`,
    token_endpoint: `${origin}/token`,
    jwks_uri: `${origin}/jwks`,
    response_types_supported: ['code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: ['openid', 'profile', 'email'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
  }));

  app.get('/jwks', () => jwks);
  app.get('/authorize', authorizeGet('generic'));
  app.post('/authorize', authorizePost('generic'));
  app.post('/token', token);

  app.get('/:tenant/discovery/v2.0/keys', () => jwks);
  app.get('/:tenant/oauth2/v2.0/authorize', authorizeGet('microsoft'));
  app.post('/:tenant/oauth2/v2.0/authorize', authorizePost('microsoft'));
  app.post('/:tenant/oauth2/v2.0/token', token);

  await app.listen({ port: options.port, host: options.host });
  const address = app.server.address() as AddressInfo;
  origin = `http://${options.host}:${String(address.port)}`;

  return { origin, close: () => app.close() };
}
