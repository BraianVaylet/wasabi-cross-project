import type { OauthProvider } from '@wasabi-cross/schemas';
import type { Env } from '../../../config/env.ts';

/** Lo único del entorno que le importa al ingreso por proveedores. */
export type OauthEnv = Pick<
  Env,
  | 'OAUTH_DEV_IDP'
  | 'GOOGLE_CLIENT_ID'
  | 'GOOGLE_CLIENT_SECRET'
  | 'MICROSOFT_CLIENT_ID'
  | 'MICROSOFT_CLIENT_SECRET'
>;

/**
 * Qué proveedores están habilitados: los que tienen su par de credenciales completo, y el IdP de
 * desarrollo si está prendido. `parseEnv` ya rechaza un par a medias; pedir los dos acá es la
 * segunda red, para que una configuración rota nunca habilite un proveedor que no puede entrar
 * a nadie.
 */
export function enabledProviders(env: OauthEnv): ReadonlySet<OauthProvider> {
  const enabled = new Set<OauthProvider>();

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) enabled.add('google');
  if (env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET) enabled.add('microsoft');
  if (env.OAUTH_DEV_IDP === 'on') enabled.add('fake-idp');

  return enabled;
}
