import type { BetterAuthOptions, BetterAuthPlugin } from 'better-auth';
import { genericOAuth } from 'better-auth/plugins';
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
      },
    ],
  });
}

type SocialProviders = NonNullable<BetterAuthOptions['socialProviders']>;

/**
 * La cara de Microsoft: el proveedor `microsoft` real de Better Auth, con las opciones que
 * tendrá en producción (tenant `consumers`), pero con la `authority` apuntando al IdP falso. La
 * llamada a Graph para la foto está fija a `graph.microsoft.com` y no se puede desviar, así que
 * acá se apaga: la foto de Microsoft se prueba a mano (F9-10).
 */
export function fakeIdpMicrosoftProvider(
  idp: Pick<FakeIdp, 'origin'>,
): NonNullable<SocialProviders['microsoft']> {
  return {
    clientId: FAKE_IDP_CLIENT_ID,
    clientSecret: FAKE_IDP_CLIENT_SECRET,
    tenantId: 'consumers',
    authority: idp.origin,
    disableProfilePhoto: true,
  };
}
