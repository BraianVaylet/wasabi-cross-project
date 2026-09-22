import { resolve } from 'node:path';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

/*
 * La API sirve el front compilado (F3-03, ADR-0007). Front y API en el mismo origen: la
 * cookie de sesión (`SameSite=Lax`) viaja sin CORS y sin depender de cómo se configuren
 * dos dominios.
 *
 * Sólo en los ambientes desplegados: en desarrollo el front lo sirve Vite, y
 * `WEB_DIST_DIR` no está.
 */

/** Lo que nunca es del front, aunque el navegador pida HTML. */
const NOT_FRONT = /^\/(?:api|docs|health|ready)(?:\/|$|\?)/;

/** ¿Este pedido es una navegación de la SPA? Sólo GET, sólo HTML, y nada de la API. */
function isSpaNavigation(request: FastifyRequest): boolean {
  const accept = request.headers.accept ?? '';
  return request.method === 'GET' && accept.includes('text/html') && !NOT_FRONT.test(request.url);
}

/**
 * Cuánto se cachea cada archivo (F3-05). Lo de `/assets/` lleva el hash del contenido en el
 * nombre (Vite): si cambia, cambia el nombre, así que se cachea un año sin miedo. Todo lo
 * demás —el `index.html`, que dice qué assets usar, y el service worker, que decide cuándo
 * hay versión nueva— se revalida siempre: una copia vieja dejaría la app trabada.
 */
function cacheControlFor(path: string): string {
  return /[\\/]assets[\\/]/.test(path) ? 'public, max-age=31536000, immutable' : 'no-cache';
}

export type SpaFallback = (request: FastifyRequest, reply: FastifyReply) => boolean;

/**
 * Registra los archivos del front y devuelve el fallback de la SPA: una ruta como
 * `/ejercicios/mex_...` no existe como archivo, así que se contesta con el `index.html` y la
 * resuelve el router del front. Un asset que falta, en cambio, es un 404 de verdad: darle
 * el `index.html` a un `<script>` sería servir HTML con otro nombre.
 */
export async function registerWebFront(
  app: FastifyInstance,
  distDir: string,
): Promise<SpaFallback> {
  await app.register(fastifyStatic, {
    root: resolve(distDir),
    // Sin comodín propio: lo que no es un archivo pasa al manejador de 404, que decide.
    wildcard: false,
    index: ['index.html'],
    // La caché la pone esto y no el plugin: sus defaults no distinguen un asset con hash de
    // un index.html (F3-05).
    cacheControl: false,
    setHeaders: (response, path) => {
      void response.header('Cache-Control', cacheControlFor(path));
    },
  });

  return (request, reply) => {
    if (!isSpaNavigation(request)) {
      return false;
    }
    void reply.sendFile('index.html');
    return true;
  };
}
