/*
 * Qué rutas de Better Auth llegan a la red (F9-05, ADR-0012).
 *
 * Better Auth monta decenas de endpoints de cuenta aunque no se use ninguno de sus plugins: cambiar
 * el email, borrar al usuario, vincular y desvincular cuentas, poner una contraseña. Con el ingreso
 * sólo por OAuth, Wasabi usa cuatro. La lista de lo expuesto es corta y explícita, y todo lo demás
 * responde como una ruta inexistente: es la puerta de entrada de toda la app, y un endpoint que
 * nadie usa es un endpoint que nadie revisó.
 */

interface ExposedRoute {
  method: string;
  /** Contra el path ya sin el prefijo `/api/auth` y sin query. Siempre anclado: ruta exacta. */
  pattern: RegExp;
}

const EXPOSED: readonly ExposedRoute[] = [
  // Empezar el ingreso con un proveedor: devuelve la URL a la que ir.
  { method: 'POST', pattern: /^\/sign-in\/social$/ },
  // La vuelta del proveedor: Better Auth abre la sesión y redirige.
  { method: 'GET', pattern: /^\/callback\/[A-Za-z0-9_-]+$/ },
  { method: 'POST', pattern: /^\/sign-out$/ },
  { method: 'GET', pattern: /^\/get-session$/ },
];

/** ¿Se expone esta ruta de Better Auth? `path` va sin el prefijo `/api/auth` y sin query. */
export function isExposedAuthRoute(method: string, path: string): boolean {
  return EXPOSED.some((route) => route.method === method && route.pattern.test(path));
}
