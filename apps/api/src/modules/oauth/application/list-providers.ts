import type { OauthProvider, OauthProvidersResponse } from '@wasabi-cross/schemas';
import { providersFrom } from '../domain/providers.ts';

/**
 * Qué proveedores puede usar el front para ingresar. Es lo primero que pide la pantalla de
 * ingreso, antes de que haya sesión, así que no depende de ningún usuario.
 */
export function listProviders(enabled: ReadonlySet<OauthProvider>): OauthProvidersResponse {
  return { providers: providersFrom(enabled) };
}
