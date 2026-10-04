import { oauthProvidersResponseSchema, type OauthProvidersResponse } from '@wasabi-cross/schemas';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

export interface OauthRoutesOptions {
  /** Inyectado desde la raíz de composición: las rutas no saben de dónde sale la configuración. */
  listProviders: () => OauthProvidersResponse;
}

export function oauthRoutes({ listProviders }: OauthRoutesOptions): FastifyPluginAsyncZod {
  // eslint-disable-next-line @typescript-eslint/require-await -- la firma del plugin de Fastify es async
  return async (app) => {
    // Sin `requireSession`: la pantalla de ingreso lo pide antes de que exista una sesión.
    app.get(
      '/oauth/providers',
      {
        schema: {
          summary: 'Proveedores de ingreso habilitados',
          description:
            'Con qué proveedores OAuth 2.0 se puede entrar (Google, Microsoft). Sin sesión: lo ' +
            'pide la pantalla de ingreso. Sólo trae el id y el nombre de cada uno, nunca las ' +
            'credenciales. Lista vacía si la API no tiene ninguno configurado.',
          tags: ['oauth'],
          response: { 200: oauthProvidersResponseSchema },
        },
      },
      () => listProviders(),
    );
  };
}
