import {
  oauthProvidersResponseSchema,
  sessionUserSchema,
  type OauthProvider,
  type OauthProviderInfo,
  type SessionUser,
} from '@wasabi-cross/schemas';
import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { ApiError, type HttpClient } from '../lib/http.ts';
import { safeRedirect } from './redirect.ts';

/**
 * La sesión, vista desde el front. Va por el mismo cliente HTTP que el resto, también contra
 * las rutas de Better Auth: la API traduce sus errores al envelope, así que el front maneja
 * un solo formato de error y manda `x-request-id` en todos lados.
 *
 * No hay email ni contraseña: se entra sólo con un proveedor OAuth (ADR-0012, spec §5.6).
 */
export interface SessionClient {
  /** El usuario de la sesión, o `null` si no hay. */
  current: () => Promise<SessionUser | null>;
  /** Los proveedores con los que se puede entrar, en el orden en que van los botones. */
  providers: () => Promise<OauthProviderInfo[]>;
  /**
   * Le pide a la API la URL de autorización del proveedor y manda al usuario ahí. Cuando vuelve
   * del proveedor, la API ya abrió la sesión (cookie) y lo lleva a `redirect`; esta promesa se
   * resuelve apenas se inicia la navegación, no cuando termina el ingreso.
   */
  signInWithProvider: (provider: OauthProvider, options?: SignInOptions) => Promise<void>;
  signOut: () => Promise<void>;
}

export interface SignInOptions {
  /** A dónde volver después de entrar. Sólo se respetan las rutas internas (`safeRedirect`). */
  redirect?: string | undefined;
}

/** Lo del navegador que necesita el ingreso, separado para poder probarlo sin uno. */
export interface Navigation {
  /** El origen del front, por ejemplo `https://app.wasabicross.com`. */
  readonly origin: string;
  /** Navega a una URL: sale de la app (es una navegación completa, no del router). */
  assign: (url: string) => void;
}

export function browserNavigation(): Navigation {
  return {
    get origin() {
      return globalThis.location.origin;
    },
    assign: (url) => {
      globalThis.location.assign(url);
    },
  };
}

const signOutResponse = z.object({ success: z.boolean() });

/**
 * Lo que responde Better Auth a `/sign-in/social`: de todo, sólo importa la URL del proveedor.
 * Es lo único a donde se navega con el resultado de un pedido, así que tiene que ser http(s):
 * un `javascript:` o un `data:` ahí sería un script en el origen de la app.
 */
const signInResponse = z.object({ url: z.url({ protocol: /^https?$/ }) });

export function createSessionClient(
  http: HttpClient,
  navigation: Navigation = browserNavigation(),
): SessionClient {
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

    providers: async () => {
      const { providers } = await http.request(
        oauthProvidersResponseSchema,
        '/api/v1/oauth/providers',
      );
      return providers;
    },

    signInWithProvider: async (provider, { redirect } = {}) => {
      const { origin } = navigation;
      const { url } = await http.request(signInResponse, '/api/auth/sign-in/social', {
        method: 'POST',
        body: {
          provider,
          // Absolutas y del front: la API puede estar en otro origen (en desarrollo lo está), y
          // sin esto el ingreso terminaría en una ruta de la API.
          callbackURL: `${origin}${safeRedirect(redirect)}`,
          errorCallbackURL: `${origin}/login`,
        },
      });
      navigation.assign(url);
    },

    signOut: async () => {
      await http.request(signOutResponse, '/api/auth/sign-out', { method: 'POST', body: {} });
    },
  };
}

export const SESSION_QUERY_KEY = ['session'] as const;

/**
 * La sesión se pide una vez al abrir la app y se actualiza a mano: al salir, o cuando la API
 * dice que venció. No hay por qué volver a pedirla sola.
 */
export function sessionQueryOptions(session: SessionClient) {
  return queryOptions({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => session.current(),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}

export const PROVIDERS_QUERY_KEY = ['oauth', 'providers'] as const;

/** Los proveedores de la pantalla de ingreso (sin sesión). Si no cargan, se puede reintentar. */
export function providersQueryOptions(session: SessionClient) {
  return queryOptions({
    queryKey: PROVIDERS_QUERY_KEY,
    queryFn: () => session.providers(),
  });
}
