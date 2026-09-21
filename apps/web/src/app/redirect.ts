/** Lo que viaja en la URL de login y registro: a dónde volver después de entrar. */
export interface RedirectSearch {
  redirect?: string | undefined;
}

/**
 * A dónde volver después de entrar. Viene en la URL, así que cualquiera puede armar un link
 * a `/login?redirect=…`: sólo se acepta una ruta interna. Todo lo demás —otro sitio, `//`,
 * barras invertidas que algunos navegadores leen como `/`, el mismo login— va a Home.
 */
export function safeRedirect(value: string | undefined): string {
  if (
    value === undefined ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    value === '/login' ||
    value.startsWith('/login?') ||
    value.startsWith('/login#')
  ) {
    return '/';
  }
  return value;
}
