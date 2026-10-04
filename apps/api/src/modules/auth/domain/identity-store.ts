/**
 * Crea usuarios y les liga una cuenta de un proveedor externo, sin pasar por ningún ingreso.
 * Reemplaza al registrador por contraseña (F9-04, ADR-0012): ya no hay contraseñas con las que
 * registrar a nadie. Lo cumple Better Auth; se conecta en el script que lo use.
 */
export interface IdentityStore {
  /** Un usuario nuevo con el email verificado y sin contraseña. Devuelve su id. */
  createUser: (input: { email: string; name: string }) => Promise<string>;
  /** Liga al usuario la cuenta `accountId` del proveedor `providerId`. */
  linkAccount: (input: { userId: string; providerId: string; accountId: string }) => Promise<void>;
}
