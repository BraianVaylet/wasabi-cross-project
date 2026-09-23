/**
 * Registra un usuario nuevo, con la misma regla de contraseña que un registro real (F1-10).
 * Lo cumple Better Auth; se conecta en la raíz de composición o en el script que lo use.
 */
export interface UserRegistrar {
  signUp: (input: { email: string; password: string; name: string }) => Promise<void>;
}
