import type { FastifyReply, FastifyRequest, onRequestAsyncHookHandler } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { AppError } from '../../../shared/errors/app-error.ts';
import type { PhotoResult } from '../application/get-photo.ts';
import { etagMatches, photoEtag, type PhotoMiss } from '../domain/photo.ts';

export interface PhotoRoutesOptions {
  /** Inyectado, como en los otros módulos: `users` no conoce el interior de `auth`. */
  requireSession: onRequestAsyncHookHandler;
  /** De `user.image` a la foto lista para servir (o al motivo por el que no hay). */
  getPhoto: (image: string) => Promise<PhotoResult>;
}

/**
 * Lo que se le dice al navegador de esta foto. `no-cache` no es "no guardar": es "preguntar antes de
 * usar" —con el ETag, un 304 y nada más—, así que cambiar de foto en el proveedor se nota al
 * siguiente ingreso. `private` y `Vary: Cookie`, porque es de una persona y la URL es la misma para
 * todas. `same-site`: en desarrollo el front y la API están en orígenes distintos del mismo sitio, y
 * el `same-origin` que pone helmet por defecto bloquearía el `<img>`; en producción es el mismo origen.
 */
function cacheHeaders(etag: string): Record<string, string> {
  return {
    etag,
    'cache-control': 'private, no-cache',
    vary: 'Cookie',
    'cross-origin-resource-policy': 'same-site',
  };
}

function sessionUser(request: FastifyRequest) {
  const user = request.currentUser;
  /* v8 ignore next 3 -- rama defensiva: requireSession corre antes y siempre puebla currentUser */
  if (!user) {
    throw new AppError('WC-SYS-500-001', { message: 'requireSession no pobló currentUser' });
  }
  return user;
}

/**
 * El 404 del catálogo, con el motivo en el log (el `reason` va en `meta`, sin la URL ni la foto). Con
 * `no-store`: un 404 sin `Cache-Control` puede guardarse por heurística, y el Perfil seguiría sin foto
 * después de que el proveedor se recupere.
 */
function noPhoto(reply: FastifyReply, reason: PhotoMiss): never {
  void reply.header('cache-control', 'no-store');
  throw new AppError('WC-USER-404-001', { meta: { reason } });
}

export function photoRoutes(options: PhotoRoutesOptions): FastifyPluginAsyncZod {
  const { requireSession, getPhoto } = options;

  // eslint-disable-next-line @typescript-eslint/require-await -- la firma del plugin de Fastify es async
  return async (app) => {
    app.get(
      '/me/photo',
      {
        onRequest: requireSession,
        schema: {
          summary: 'Mi foto',
          description:
            'La foto del usuario de la sesión (PNG, JPEG o WebP), servida desde el origen de la API: ' +
            'la del proveedor no se enlaza directo, así la CSP no cambia. No lleva id: cada uno sólo ' +
            'puede pedir la suya. Con `ETag` y `If-None-Match`, 304. Sin foto, o si el proveedor no ' +
            'responde, 404 `WC-USER-404-001`.',
          tags: ['users'],
        },
      },
      async (request, reply) => {
        const { image } = sessionUser(request);
        if (image === undefined) {
          return noPhoto(reply, 'sin_foto');
        }

        // Antes de bajar nada: revalidar no le pide al proveedor lo que ya se sabe.
        const etag = photoEtag(image);
        if (etagMatches(request.headers['if-none-match'], etag)) {
          return reply.code(304).headers(cacheHeaders(etag)).send();
        }

        const result = await getPhoto(image);
        if (!result.found) {
          return noPhoto(reply, result.reason);
        }

        // Los headers de caché van recién acá: un 404 con `ETag` se quedaría guardado.
        return reply
          .headers(cacheHeaders(etag))
          .type(result.photo.type)
          .send(Buffer.from(result.photo.bytes));
      },
    );
  };
}
