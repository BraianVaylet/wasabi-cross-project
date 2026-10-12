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
  /**
   * Lo que el proveedor mandó como foto, tal cual lo guarda Better Auth en `user.image`: un data URL
   * (Microsoft) o una URL de Google. Es de la API y de nadie más: `/me` sólo dice si hay (`hasPhoto`)
   * y el front la pide a `/me/photo`, que la sirve desde el origen de la API (F9-08).
   */
  readonly image?: string | undefined;
}
