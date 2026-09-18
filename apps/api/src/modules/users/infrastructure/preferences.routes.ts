import {
  updatePreferencesSchema,
  userPreferencesSchema,
  type UpdatePreferences,
  type UserPreferences,
} from '@wasabi-cross/schemas';
import type { FastifyRequest, onRequestAsyncHookHandler } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { AppError } from '../../../shared/errors/app-error.ts';

export interface PreferencesRoutesOptions {
  /** Inyectado, como en los otros módulos: `users` no conoce el interior de `auth`. */
  requireSession: onRequestAsyncHookHandler;
  getPreferences: (userId: string) => Promise<UserPreferences>;
  updatePreferences: (userId: string, change: UpdatePreferences) => Promise<UserPreferences>;
}

function sessionUserId(request: FastifyRequest): string {
  const user = request.currentUser;
  /* v8 ignore next 3 -- rama defensiva: requireSession corre antes y siempre puebla currentUser */
  if (!user) {
    throw new AppError('WC-SYS-500-001', { message: 'requireSession no pobló currentUser' });
  }
  return user.id;
}

export function preferencesRoutes(options: PreferencesRoutesOptions): FastifyPluginAsyncZod {
  const { requireSession, getPreferences, updatePreferences } = options;

  // eslint-disable-next-line @typescript-eslint/require-await -- la firma del plugin de Fastify es async
  return async (app) => {
    app.get(
      '/me/preferences',
      {
        onRequest: requireSession,
        schema: {
          summary: 'Mis preferencias',
          description:
            'Tema y porcentajes de carga. Lo que el usuario nunca cambió viene con su default: ' +
            'tema oscuro y 65/75/80/85/90/95.',
          tags: ['users'],
          response: { 200: userPreferencesSchema },
        },
      },
      async (request) => getPreferences(sessionUserId(request)),
    );

    app.patch(
      '/me/preferences',
      {
        onRequest: requireSession,
        schema: {
          summary: 'Cambiar mis preferencias',
          description:
            'Una o las dos. Lo que no viene queda como estaba. Devuelve las preferencias completas.',
          tags: ['users'],
          body: updatePreferencesSchema,
          response: { 200: userPreferencesSchema },
        },
      },
      async (request) => updatePreferences(sessionUserId(request), request.body),
    );
  };
}
