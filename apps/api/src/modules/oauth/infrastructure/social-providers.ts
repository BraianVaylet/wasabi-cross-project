import type { BetterAuthOptions } from 'better-auth';
import { microsoft } from 'better-auth/social-providers';
import {
  MICROSOFT_DEFAULT_AUTHORITY,
  decodeIdTokenClaims,
  isConsumerMicrosoftToken,
  type MicrosoftClaimsExpectation,
} from '../domain/microsoft-claims.ts';
import { profileName } from '../domain/profile.ts';

/*
 * La configuración de Google y de Microsoft para Better Auth (F9-05, spec §5.6, ADR-0012).
 * `auth` no importa este módulo: `startServer` arma esto y se lo inyecta a `createAuth`.
 */

type SocialProviders = NonNullable<BetterAuthOptions['socialProviders']>;
type MicrosoftOptions = Parameters<typeof microsoft>[0];
type MicrosoftUserInfo = NonNullable<MicrosoftOptions['getUserInfo']>;

/** Lo único del entorno que mira: las credenciales de cada par y, para desarrollo, la authority. */
export interface SocialProvidersEnv {
  GOOGLE_CLIENT_ID?: string | undefined;
  GOOGLE_CLIENT_SECRET?: string | undefined;
  MICROSOFT_CLIENT_ID?: string | undefined;
  MICROSOFT_CLIENT_SECRET?: string | undefined;
  MICROSOFT_AUTHORITY?: string | undefined;
}

/**
 * El nombre del usuario sale del perfil del proveedor o, sin él, de la parte local del email, y es
 * **lo único** que se toma: lo demás del perfil —un `plan: "pro"` inventado, por ejemplo— no pasa al
 * usuario (spec §5.6). El plan lo cambia `subscriptions`, nunca un proveedor.
 */
function mapProfileToUser(profile: { name?: unknown; email?: unknown }): { name: string } {
  return { name: profileName(profile) };
}

/**
 * Envuelve el `getUserInfo` de Microsoft con el chequeo del `tid`, el `iss` y el `aud`. Better Auth
 * tiene ese chequeo (`verifyClaims`) pero no lo corre en el flujo con `code` (F9-03): sin esto, un
 * token con el `tid` de una organización entraría si algún día el endpoint o el tenant cambian.
 * Devuelve `null` —Better Auth vuelve a `/login` con `unable_to_get_user_info`— sin llamar al de
 * Better Auth, así que tampoco se baja la foto.
 */
export function guardMicrosoftUserInfo(
  getUserInfo: MicrosoftUserInfo,
  expected: MicrosoftClaimsExpectation,
): MicrosoftUserInfo {
  return async (token) => {
    const claims = token.idToken ? decodeIdTokenClaims(token.idToken) : null;
    if (!claims || !isConsumerMicrosoftToken(claims, expected)) return null;

    return getUserInfo(token);
  };
}

function microsoftProvider(
  clientId: string,
  clientSecret: string,
  authority: string | undefined,
): MicrosoftOptions {
  const options: MicrosoftOptions = {
    clientId,
    clientSecret,
    // Sólo cuentas personales: en las de trabajo o escuela el email lo controla el administrador
    // del tenant (ADR-0012).
    tenantId: 'consumers',
    // Los scopes por defecto de Better Auth incluyen `offline_access` (un refresh token). Se piden
    // sólo los que hacen falta; `User.Read` es el que deja bajar la foto.
    disableDefaultScope: true,
    scope: ['openid', 'profile', 'email', 'User.Read'],
    prompt: 'select_account',
    profilePhotoSize: 96,
    overrideUserInfoOnSignIn: true,
    mapProfileToUser,
    // Apuntada al IdP falso de desarrollo: la llamada a Graph para la foto está fija a
    // `graph.microsoft.com` y no se puede desviar, así que se apaga.
    ...(authority ? { authority, disableProfilePhoto: true } : {}),
  };

  // El `getUserInfo` por defecto de Better Auth, el de una instancia armada con estas mismas
  // opciones sin la guarda. Va en una flecha: es un método suyo.
  const better = microsoft(options);

  return {
    ...options,
    getUserInfo: guardMicrosoftUserInfo((token) => better.getUserInfo(token), {
      authority: authority ?? MICROSOFT_DEFAULT_AUTHORITY,
      clientId,
    }),
  };
}

/**
 * Los proveedores sociales que tienen su par de credenciales completo. El IdP falso de desarrollo
 * no va acá: entra por `plugins` (F9-03), nunca por la configuración de producción.
 */
export function socialProvidersFor(env: SocialProvidersEnv): SocialProviders {
  const providers: SocialProviders = {};

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // Cerrar sesión en Wasabi no cierra la de Google: sin esto, en un teléfono compartido
      // entraría solo a la cuenta equivocada (spec §5.6).
      prompt: 'select_account',
      // No arrastra permisos concedidos antes. Y no hay `accessType: 'offline'`: no hay refresh
      // token que guardar.
      includeGrantedScopes: false,
      overrideUserInfoOnSignIn: true,
      mapProfileToUser,
    };
  }

  if (env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET) {
    providers.microsoft = microsoftProvider(
      env.MICROSOFT_CLIENT_ID,
      env.MICROSOFT_CLIENT_SECRET,
      env.MICROSOFT_AUTHORITY,
    );
  }

  return providers;
}
