import type { Db } from 'mongodb';
import { seedAdmin } from '../src/modules/auth/application/seed-admin.ts';
import type { Auth } from '../src/modules/auth/infrastructure/better-auth.ts';
import { createIdentityStore } from '../src/modules/auth/infrastructure/identity-store.ts';
import { FAKE_IDP_PROVIDER_ID } from './fake-idp-auth.ts';
import { DEV_ADMIN, fakeIdpSubjectFor } from './fake-idp.ts';

/**
 * Siembra al admin de desarrollo (plan Pro) ligado a la cuenta que emite el IdP falso: así, entrar
 * con un clic por el IdP —que ofrece a este mismo admin cargado— abre su sesión y no crea otro
 * usuario Free. Lo comparten `scripts/seed-admin.ts` y `scripts/ephemeral.ts`.
 *
 * Sin contraseña (ADR-0012). El email y el nombre se pueden cambiar con `SEED_ADMIN_EMAIL` y
 * `SEED_ADMIN_NAME`; el IdP deriva la cuenta del email, así que sigue coincidiendo.
 */
export function seedDevAdmin(options: {
  auth: Auth;
  db: Db;
  email?: string | undefined;
  name?: string | undefined;
}): Promise<{ email: string; created: boolean }> {
  const email = options.email ?? DEV_ADMIN.email;

  return seedAdmin(createIdentityStore(options.auth), options.db, {
    email,
    name: options.name ?? DEV_ADMIN.name,
    providerId: FAKE_IDP_PROVIDER_ID,
    accountId: fakeIdpSubjectFor(email),
  });
}
