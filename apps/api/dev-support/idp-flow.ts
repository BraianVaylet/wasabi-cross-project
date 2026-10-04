import { chooseAtIdp, type Choice } from './fake-idp-client.ts';

/*
 * El ingreso entero por el IdP falso, como lo recorrería un navegador, para los tests de
 * `dev-support/`: /sign-in/social → pantalla del IdP → /callback/<id> → cookie de sesión. Va contra
 * `auth.handler` (Request/Response web), sin levantar Fastify.
 */

/** Las cookies que el navegador guardaría entre pasos. */
export class Jar {
  private readonly cookies = new Map<string, string>();

  absorb(response: Response): void {
    for (const line of response.headers.getSetCookie()) {
      const pair = line.split(';')[0] ?? '';
      const separator = pair.indexOf('=');
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      if (value === '' || /max-age=0/i.test(line)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  header(): string {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  hasSession(): boolean {
    return [...this.cookies.keys()].some((name) => name.endsWith('session_token'));
  }
}

export interface Attempt {
  jar: Jar;
  /** La URL a la que Better Auth manda al navegador al terminar. */
  finalLocation: string;
  /** La URL del callback que el IdP le dio al navegador. */
  callbackUrl: string;
  callbackStatus: number;
}

export interface FlowOptions {
  /** `BETTER_AUTH_URL`: dónde está la API. */
  base: string;
  /** El origen del front: Better Auth exige un `Origin` de confianza en los POST. */
  webOrigin: string;
  provider: string;
  choice: Choice;
  /** Para alterar el callback antes de que vuelva a la API (un `state` cambiado, por ejemplo). */
  mutateCallback?: (url: URL) => void;
  /** Se espera antes de volver a la API: sirve para soltar dos callbacks en el mismo instante. */
  beforeCallback?: () => Promise<void>;
}

/** Cualquier cosa con el `handler` de Better Auth. */
export interface HasHandler {
  handler: (request: Request) => Promise<Response>;
}

/** Recorre el ingreso entero: empieza, elige en el IdP y vuelve al callback de la API. */
export async function signInVia(auth: HasHandler, options: FlowOptions): Promise<Attempt> {
  const { base, webOrigin, provider, choice, mutateCallback, beforeCallback } = options;
  const jar = new Jar();

  const start = await auth.handler(
    new Request(`${base}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: webOrigin },
      body: JSON.stringify({ provider, callbackURL: '/inicio', errorCallbackURL: '/login' }),
    }),
  );
  if (start.status !== 200) throw new Error(`sign-in/social: ${String(start.status)}`);
  jar.absorb(start);
  const { url } = (await start.json()) as { url: string };

  const atIdp = await chooseAtIdp(url, choice);
  const callback = new URL(atIdp.headers.get('location') ?? '');
  mutateCallback?.(callback);
  await beforeCallback?.();

  const back = await auth.handler(new Request(callback, { headers: { cookie: jar.header() } }));
  jar.absorb(back);

  return {
    jar,
    finalLocation: back.headers.get('location') ?? '',
    callbackUrl: callback.toString(),
    callbackStatus: back.status,
  };
}
