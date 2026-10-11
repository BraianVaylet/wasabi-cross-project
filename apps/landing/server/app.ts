import { access, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';

/*
 * El servidor estático de la landing (F10-11, ADR-0013, spec §13): lo que Railway corre para servir
 * `apps/landing/dist`. Es un Fastify mínimo —las mismas dependencias que la API, con la misma
 * versión— y no tiene nada más que archivos: sin cookies, sin base de datos, sin JavaScript de
 * cliente, sin fallback de SPA.
 *
 * Corre con `node server/server.ts`: Node 24 ejecuta TypeScript sin compilarlo (sólo sintaxis
 * "borrable": nada de enums ni de parámetros-propiedad, y las importaciones con `.ts`).
 */

/** `apps/landing/dist`, relativo a este archivo: el build que deja `astro build`. */
export function defaultDistDir(): string {
  return fileURLToPath(new URL('../dist', import.meta.url));
}

/**
 * Cuánto se cachea cada archivo. Lo de `/_astro/` lleva el hash del contenido en el nombre (Astro,
 * Vite): si cambia, cambia el nombre, así que se guarda un año sin miedo. Todo lo demás —el HTML, que
 * dice qué assets usar, y lo que no tiene hash en el nombre (`og.png`, el favicon, `robots.txt`)— se
 * revalida siempre, con el ETag: un cambio de copy se ve al recargar, y no cuesta un 200 entero.
 */
function cacheControlFor(path: string): string {
  return /[\\/]_astro[\\/]/.test(path) ? 'public, max-age=31536000, immutable' : 'no-cache';
}

export interface LandingServerOptions {
  /** Dónde está el build (`apps/landing/dist`). */
  root: string;
  logger?: FastifyServerOptions['logger'];
}

export async function buildLandingServer({
  root,
  logger = false,
}: LandingServerOptions): Promise<FastifyInstance> {
  const dist = resolve(root);

  // Sin build no hay nada que servir: mejor no arrancar que contestar 404 a todo y que Railway lo
  // dé por sano.
  try {
    await access(join(dist, 'index.html'));
  } catch {
    throw new Error(
      `No hay un build de la landing en ${dist}: falta index.html. Corré \`pnpm --filter @wasabi-cross/landing build\`.`,
    );
  }
  const notFoundPage = await readFile(join(dist, '404.html'));

  const app = Fastify({ logger });

  await app.register(helmet, {
    // Explícita y sin los defaults de helmet: lo que no está acá no se admite. La landing no tiene
    // JavaScript (`script-src 'none'`) y todo su CSS está en archivos (`inlineStylesheets: 'never'`,
    // F10-01), así que no hace falta `unsafe-inline` en ningún lado. Sin `data:`: el build no los usa.
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'none'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'"],
        fontSrc: ["'self'"],
        connectSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    // Los mismos que la API (apps/api/src/app.ts).
    hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'no-referrer' },
  });

  // El chequeo de Railway. Antes que el comodín de los archivos.
  app.get('/health', (_request, reply) => {
    void reply.header('cache-control', 'no-store');
    return { status: 'ok' };
  });

  await app.register(fastifyStatic, {
    root: dist,
    index: ['index.html'],
    // `/privacidad` → `/privacidad/`, que es donde Astro deja `privacidad/index.html`.
    redirect: true,
    // Los archivos ocultos no existen para el servidor (`/.env`, `/.git/...`).
    dotfiles: 'ignore',
    // La caché la pone `setHeaders`: los defaults del plugin no distinguen un asset con hash de un
    // HTML.
    cacheControl: false,
    setHeaders: (reply, path) => {
      void reply.header('Cache-Control', cacheControlFor(path));
    },
  });

  // Lo que no existe, y cualquier método que no sea GET o HEAD, es un 404 con la página de la marca.
  // Sin fallback de SPA: la landing no tiene rutas del lado del cliente, y servirle el `index.html`
  // a un asset que falta es HTML con otro nombre.
  app.setNotFoundHandler((_request, reply) => {
    void reply
      .code(404)
      .header('cache-control', 'no-cache')
      .type('text/html; charset=utf-8')
      .send(notFoundPage);
  });

  return app;
}
