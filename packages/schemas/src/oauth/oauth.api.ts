import { z } from 'zod';

/*
 * Contratos del ingreso con OAuth 2.0 (F9-01, spec §5.6, ADR-0012). Los usan el módulo `oauth`
 * de la API y la pantalla de ingreso del front.
 */

/**
 * Los proveedores con los que se puede entrar. `fake-idp` es el IdP de desarrollo (F9-03): la API
 * no lo lista nunca con `NODE_ENV=production`; está acá porque el front tiene que poder tipar lo
 * que la API le devuelve en desarrollo y en el E2E.
 */
export const oauthProviderSchema = z.enum(['google', 'microsoft', 'fake-idp']);
export type OauthProvider = z.infer<typeof oauthProviderSchema>;

/**
 * Un proveedor habilitado, como lo ve el front: con qué id se lo pide y cómo se llama en el
 * botón. Estricto a propósito: si la API algún día mandara de más (un id de cliente, un secreto),
 * esto falla en vez de dejarlo pasar.
 */
export const oauthProviderInfoSchema = z.strictObject({
  id: oauthProviderSchema,
  label: z.string().min(1),
});

export type OauthProviderInfo = z.infer<typeof oauthProviderInfoSchema>;

/** Lo que responde `GET /api/v1/oauth/providers`, sin sesión: el ingreso lo necesita antes de entrar. */
export const oauthProvidersResponseSchema = z.strictObject({
  providers: z.array(oauthProviderInfoSchema),
});

export type OauthProvidersResponse = z.infer<typeof oauthProvidersResponseSchema>;

/** Los códigos de `docs/error-codes.md` con los que el ingreso le avisa a la persona que algo no salió. */
export type OauthErrorCode = 'WC-OAUTH-400-001' | 'WC-OAUTH-400-002' | 'WC-OAUTH-409-003';

/**
 * Traduce el `?error=` con el que Better Auth vuelve a `/login` (el callback no responde con un
 * 4xx: redirige) a un código del catálogo. Sólo dos valores tienen un código propio, y cualquier
 * otro —`state_mismatch`, `invalid_code`, `email_not_verified`, un valor que nunca vimos, algo que
 * no es un texto— cae en el genérico.
 *
 * Nunca devuelve el texto recibido: el parámetro lo puede armar cualquiera con un link, así que
 * a la pantalla sólo llega un mensaje del catálogo.
 */
export function oauthErrorFor(value: unknown): OauthErrorCode {
  switch (value) {
    case 'access_denied':
      return 'WC-OAUTH-400-001';
    case 'account_not_linked':
      return 'WC-OAUTH-409-003';
    default:
      return 'WC-OAUTH-400-002';
  }
}
