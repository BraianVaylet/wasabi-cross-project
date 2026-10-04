/** Lo último que queda si el proveedor no trae ni nombre ni email: Better Auth exige uno. */
export const FALLBACK_NAME = 'Atleta';

/**
 * El nombre visible ("Hi, Braian!") es el del proveedor; si no lo trae, la parte local del email
 * (spec §5.6). No hay pantalla para cambiarlo, así que no se intenta embellecerlo.
 *
 * Recibe el perfil tal como lo manda el proveedor, con lo que haya: cualquier campo puede faltar o
 * no ser un texto.
 */
export function profileName(profile: { name?: unknown; email?: unknown }): string {
  const { name, email } = profile;

  if (typeof name === 'string' && name.trim() !== '') return name.trim();

  if (typeof email === 'string') {
    const local = email.split('@')[0]?.trim();
    if (local) return local;
  }

  return FALLBACK_NAME;
}
