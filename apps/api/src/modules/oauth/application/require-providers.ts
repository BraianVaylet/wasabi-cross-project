import type { OauthProvider } from '@wasabi-cross/schemas';

/**
 * Con el ingreso sólo por OAuth (ADR-0012), una API sin ningún proveedor habilitado no deja entrar
 * a nadie: no tiene sentido que arranque. La corre el arranque del servidor, no `parseEnv`:
 * `migrate` y `seed` leen el mismo entorno y no necesitan ningún proveedor.
 */
export function requireEnabledProviders(enabled: ReadonlySet<OauthProvider>): void {
  if (enabled.size > 0) return;

  throw new Error(
    'No hay ningún proveedor de ingreso habilitado, y sin uno nadie puede entrar. Configurá ' +
      'GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET, MICROSOFT_CLIENT_ID y MICROSOFT_CLIENT_SECRET, o ' +
      '—sólo en desarrollo— OAUTH_DEV_IDP=on (spec §5.6, ADR-0012).',
  );
}
