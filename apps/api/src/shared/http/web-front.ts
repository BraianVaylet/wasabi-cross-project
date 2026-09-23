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
  });

  return (request, reply) => {
    if (!isSpaNavigation(request)) {
      return false;
    }
    void reply.sendFile('index.html');
    return true;
  };
}
