import { sessionUserSchema, type SessionUser } from '@wasabi-cross/schemas';
import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { ApiError, type HttpClient } from '../lib/http.ts';

/**
 * La sesión, vista desde el front. Va por el mismo cliente HTTP que el resto, también contra
 * las rutas de Better Auth: la API traduce sus errores al envelope, así que el front maneja
 * un solo formato de error y manda `x-request-id` en todos lados.
 */
export interface SessionClient {
  /** El usuario de la sesión, o `null` si no hay. */
  current: () => Promise<SessionUser | null>;
  signOut: () => Promise<void>;
}

const signOutResponse = z.object({ success: z.boolean() });

export function createSessionClient(http: HttpClient): SessionClient {
  return {
    current: async () => {
      try {
        return await http.request(sessionUserSchema, '/api/v1/me');
      } catch (error) {
        // Sin sesión no es un error: es la respuesta. Una API caída sí lo es.
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },

    signOut: async () => {
      await http.request(signOutResponse, '/api/auth/sign-out', { method: 'POST', body: {} });
    },
  };
}

export const SESSION_QUERY_KEY = ['session'] as const;

/**
 * La sesión se pide una vez al abrir la app y se actualiza a mano: al entrar, al salir, o
 * cuando la API dice que venció. No hay por qué volver a pedirla sola.
 */
export function sessionQueryOptions(session: SessionClient) {
  return queryOptions({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => session.current(),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}
