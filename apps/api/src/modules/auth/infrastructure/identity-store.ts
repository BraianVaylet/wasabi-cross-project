import type { IdentityStore } from '../domain/identity-store.ts';
import type { Auth } from './better-auth.ts';

/**
 * Crea el usuario y liga la cuenta por el adaptador interno de Better Auth, no con un insert
 * directo: así el id lleva su prefijo (ADR-0004) y los campos quedan como los que escribiría un
 * ingreso de verdad.
 */
export function createIdentityStore(auth: Auth): IdentityStore {
  return {
    createUser: async ({ email, name }) => {
      const { internalAdapter } = await auth.$context;
      // `method` dice de dónde viene el usuario: no es un ingreso, lo creó el seed.
      const user = await internalAdapter.createUser(
        { email, name, emailVerified: true },
        { method: 'seed' },
      );

      return user.id;
    },

    linkAccount: async ({ userId, providerId, accountId }) => {
      const { internalAdapter } = await auth.$context;
      await internalAdapter.linkAccount({ userId, providerId, accountId });
    },
  };
}
