import {
  sessionUserSchema,
  type SignIn,
  type SessionUser,
  type SignUpRequest,
} from '@wasabi-cross/schemas';
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
  signIn: (credentials: SignIn) => Promise<void>;
  signUp: (input: SignUpRequest) => Promise<void>;
  signOut: () => Promise<void>;
}

const signOutResponse = z.object({ success: z.boolean() });

/*
 * De entrar y registrarse sólo importa que hayan salido bien: quién es el usuario se
 * vuelve a pedir a `/me`, que es el contrato nuestro. Lo que devuelve Better Auth es suyo.
 */
const ignoredResponse = z.unknown();

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

    signIn: async (credentials) => {
      await http.request(ignoredResponse, '/api/auth/sign-in/email', {
        method: 'POST',
        body: credentials,
      });
    },

    signUp: async (input) => {
      await http.request(ignoredResponse, '/api/auth/sign-up/email', {
        method: 'POST',
        body: input,
      });
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
