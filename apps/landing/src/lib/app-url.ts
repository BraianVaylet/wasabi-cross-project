/*
 * A dónde lleva "Entrar" (spec §5.7): al ingreso de la app (`/login`, §5.6), en la URL de la
 * variable de build `PUBLIC_APP_URL`. La variable es el origen de la app (`https://app.…`); si trae
 * un camino, se descarta.
 */

/**
 * La URL del ingreso de la app, o `null` si no hay a dónde llevar (variable no definida o vacía):
 * mientras la app no esté en producción, la landing no muestra "Entrar" ni "Empezar gratis".
 *
 * Un valor que no es una URL http(s) **rompe el build** en vez de ocultar los botones: un deploy
 * mal configurado se tiene que notar, y `javascript:` o `data:` nunca llegan a un `href`.
 */
export function urlIngreso(appUrl: string | undefined): string | null {
  const valor = appUrl?.trim();
  if (valor === undefined || valor === '') return null;

  let origen: URL;
  try {
    origen = new URL(valor);
  } catch {
    throw new Error(`PUBLIC_APP_URL ("${valor}") no es una URL: tiene que ser http(s)://host`);
  }
  if (origen.protocol !== 'http:' && origen.protocol !== 'https:') {
    throw new Error(`PUBLIC_APP_URL tiene que ser http o https, no ${origen.protocol}`);
  }
  return new URL('/login', origen).href;
}
