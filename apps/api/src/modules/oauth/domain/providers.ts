import type { OauthProvider, OauthProviderInfo } from '@wasabi-cross/schemas';

/**
 * Cómo se llama cada proveedor en el botón de ingreso (spec §5.6). El IdP de desarrollo
 * (F9-03) se nombra distinto a propósito: en la pantalla no se tiene que confundir con uno de
 * verdad.
 */
const LABELS = {
  google: 'Google',
  microsoft: 'Microsoft',
  'fake-idp': 'Ingreso de desarrollo',
} as const satisfies Record<OauthProvider, string>;

/** El orden fijo de los botones, para que no dependa de cómo se leyó la configuración. */
export const DISPLAY_ORDER: readonly OauthProvider[] = ['google', 'microsoft', 'fake-idp'];

/** Los proveedores habilitados, listos para mostrar: con su nombre y en su orden. */
export function providersFrom(enabled: ReadonlySet<OauthProvider>): OauthProviderInfo[] {
  return DISPLAY_ORDER.filter((id) => enabled.has(id)).map((id) => ({ id, label: LABELS[id] }));
}
