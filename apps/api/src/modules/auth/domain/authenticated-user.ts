import type { Plan } from '@wasabi-cross/schemas';

/**
 * Lo que la API sabe de quien está haciendo el request. Es lo mínimo para decidir
 * permisos: quién es y qué plan tiene. El perfil completo lo sirve el módulo `users`.
 */
export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly plan: Plan;
}
