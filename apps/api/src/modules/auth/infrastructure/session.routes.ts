import { sessionUserSchema } from '@wasabi-cross/schemas';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { AppError } from '../../../shared/errors/app-error.ts';
import type { Auth } from './better-auth.ts';
import { requireSession } from './require-session.ts';

/**
 * Quién soy. Es el endpoint protegido más chico posible, y el que usa el front al
 * arrancar para saber si hay sesión.
 */
export function sessionRoutes(auth: Auth): FastifyPluginAsyncZod {
  // eslint-disable-next-line @typescript-eslint/require-await -- la firma del plugin de Fastify es async
  return async (app) => {
    app.get(
      '/me',
      {
        onRequest: requireSession(auth),
        schema: {
          summary: 'Usuario de la sesión actual',
          tags: ['auth'],
          response: { 200: sessionUserSchema },
        },
      },
      (request) => {
        /* v8 ignore start -- rama defensiva: requireSession corre antes y siempre puebla currentUser */
        if (!request.currentUser) {
          // No debería pasar: requireSession corre antes. Si pasa, es un bug de
          // cableado y no una sesión inválida.
          throw new AppError('WC-SYS-500-001', { message: 'requireSession no pobló currentUser' });
        }
        /* v8 ignore stop */

        return request.currentUser;
      },
    );
  };
}
