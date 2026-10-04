import type { FastifyPluginAsync } from 'fastify';
import { AUTH_BASE_PATH, type Auth } from './better-auth.ts';
import { translateAuthError } from './auth-error.ts';
import { isExposedAuthRoute } from './auth-route-policy.ts';
import { AppError } from '../../../shared/errors/app-error.ts';
import { ERROR_CATALOG } from '../../../shared/errors/error-codes.ts';

/**
 * Monta el handler de Better Auth bajo `/api/auth/*`.
 *
 * Better Auth habla Request/Response del estándar web y Fastify habla lo suyo, así que
 * este plugin traduce en los dos sentidos. Va encapsulado: el parser de body crudo que
 * necesita no debe afectar al resto de la API, que sí quiere su JSON ya parseado.
 *
 * No expone todo lo que Better Auth trae: sólo lo que Wasabi usa (`isExposedAuthRoute`, F9-05).
 * Cualquier otra ruta —el registro y el login por contraseña, entre muchas— responde como una
 * ruta inexistente, sin llegar a Better Auth.
 */
export function authRoutes(auth: Auth): FastifyPluginAsync {
  // eslint-disable-next-line @typescript-eslint/require-await -- la firma del plugin de Fastify es async
  return async (app) => {
    // Better Auth firma y valida el body tal cual viene; si Fastify lo parsea y se
    // vuelve a serializar, cambia y deja de coincidir.
    app.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) => {
      done(null, body);
    });

    app.route({
      method: ['GET', 'POST'],
      url: `${AUTH_BASE_PATH}/*`,
      handler: async (request, reply) => {
        const url = new URL(request.url, `${request.protocol}://${request.host}`);

        const path = url.pathname.startsWith(AUTH_BASE_PATH)
          ? url.pathname.slice(AUTH_BASE_PATH.length)
          : url.pathname;
        if (!isExposedAuthRoute(request.method, path)) {
          throw new AppError('WC-SYS-404-003', { meta: { url: request.url } });
        }

        const headers = new Headers();
        for (const [key, value] of Object.entries(request.headers)) {
          if (Array.isArray(value)) {
            for (const item of value) headers.append(key, item);
          } else if (value !== undefined) {
            headers.append(key, value);
          }
        }

        const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
        const response = await auth.handler(
          new Request(url, {
            method: request.method,
            headers,
            ...(hasBody && typeof request.body === 'string' ? { body: request.body } : {}),
          }),
        );

        reply.status(response.status);

        // getSetCookie() por separado: un forEach sobre los headers colapsa varias
        // cookies en una sola línea y el browser descarta todas menos la primera.
        const setCookies = response.headers.getSetCookie();
        if (setCookies.length > 0) {
          void reply.header('set-cookie', setCookies);
        }

        response.headers.forEach((value, key) => {
          if (key.toLowerCase() !== 'set-cookie') {
            void reply.header(key, value);
          }
        });

        const body = await response.text();

        if (response.status >= 400) {
          const translated = translateAuthError(response.status, body);
          request.log.warn(
            { errorCode: translated.errorCode, url: request.url },
            'Better Auth rechazó el request',
          );

          // El status que dice el código del catálogo, no el de Better Auth: un 422 con
          // `WC-SYS-400-002` contradice a su propio envelope.
          reply.status(ERROR_CATALOG[translated.errorCode].status);
          // El envelope es JSON, diga lo que diga el header que se copió de Better Auth: el 429 del
          // límite de intentos viene como `text/plain`, y Fastify no serializa un objeto con ese
          // content-type (respondía 500 en vez de 429).
          reply.type('application/json; charset=utf-8');

          return reply.send({ ...translated, requestId: request.id });
        }

        return reply.send(body);
      },
    });
  };
}
