import type { BetterAuthOptions, BetterAuthPlugin } from 'better-auth';
import { genericOAuth } from 'better-auth/plugins';
import { profileName } from '../src/modules/oauth/domain/profile.ts';
import { socialProvidersFor } from '../src/modules/oauth/infrastructure/social-providers.ts';
import { FAKE_IDP_CLIENT_ID, FAKE_IDP_CLIENT_SECRET, type FakeIdp } from './fake-idp.ts';

/*
 * Cómo se conecta el IdP falso a Better Auth (F9-03). Vive acá y no en `src/`: la API de
 * producción no sabe que existe. `scripts/dev.ts` lo arma y se lo inyecta a `createAuth`.
 */

export const FAKE_IDP_PROVIDER_ID = 'fake-idp';

/**
 * La cara genérica, registrada con `genericOAuth` como el proveedor `fake-idp`. En Better Auth 1.7
 * un proveedor genérico se usa con los mismos `/sign-in/social` y `/callback/<id>` que los de
 * verdad, así que el front no necesita un caso aparte.
 *
 * Con las mismas reglas que Google y Microsoft (F9-05): el nombre es el del perfil o, sin él, la
 * parte local del email, y se refresca en cada ingreso. Nada más del perfil pasa al usuario.
 */
export function fakeIdpAuthPlugin(idp: Pick<FakeIdp, 'origin'>): BetterAuthPlugin {
  return genericOAuth({
    config: [
      {
        providerId: FAKE_IDP_PROVIDER_ID,
        discoveryUrl: `${idp.origin}/.well-known/openid-configuration`,
        clientId: FAKE_IDP_CLIENT_ID,
        clientSecret: FAKE_IDP_CLIENT_SECRET,
        scopes: ['openid', 'profile', 'email'],
        pkce: true,
        overrideUserInfo: true,
        mapProfileToUser: (profile) => ({ name: profileName(profile) }),
      },
    ],
  });
}

type SocialProviders = NonNullable<BetterAuthOptions['socialProviders']>;

/**
 * La cara de Microsoft: el proveedor `microsoft` **de producción** —armado por el mismo
 * `socialProvidersFor` que usa `startServer`—, con las credenciales del IdP falso y la `authority`
 * apuntando a él. Así lo que se prueba es la configuración real: tenant `consumers`, el chequeo del
 * `tid`, los scopes, la foto apagada (Graph no se puede desviar: se prueba a mano en F9-10).
 */
export function fakeIdpSocialProviders(idp: Pick<FakeIdp, 'origin'>): SocialProviders {
  return socialProvidersFor({
    MICROSOFT_CLIENT_ID: FAKE_IDP_CLIENT_ID,
    MICROSOFT_CLIENT_SECRET: FAKE_IDP_CLIENT_SECRET,
    MICROSOFT_AUTHORITY: idp.origin,
  });
}
