import type { UserRegistrar } from '../domain/user-registrar.ts';
import type { Auth } from './better-auth.ts';

/** Registra por la API de Better Auth: el mismo camino que un `POST /sign-up/email` real. */
export function createUserRegistrar(auth: Auth): UserRegistrar {
  return {
    signUp: async ({ email, password, name }) => {
      await auth.api.signUpEmail({ body: { email, password, name } });
    },
  };
}
