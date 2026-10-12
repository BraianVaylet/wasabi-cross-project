/*
 * El acceso rápido de `pnpm dev` (F10-01): lo que `scripts/dev.ts` imprime al levantar la landing,
 * como la línea `➜ Local: http://localhost:5173/` que muestra Vite para la web.
 *
 * Astro ya dice dónde escucha, pero **cómo** lo dice cambia: texto normal en una terminal, y JSON
 * (con la URL adentro de un string, pegada a un `\n` escapado) cuando detecta que lo corre un
 * agente. Y el puerto no es siempre el 4321: si estaba ocupado, Astro toma el siguiente. Por eso
 * no se imprime un puerto fijo: se lee de lo que Astro dijo.
 */

/** Una URL local con puerto: `localhost`, `127.0.0.1` o `[::1]`. La línea Network no cuenta. */
const URL_LOCAL = /https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):(\d{2,5})(?!\d)/;

/** El puerto de la primera URL local de la salida de Astro, o `null` si todavía no la dijo. */
export function puertoDeAstro(salida: string): number | null {
  const puerto = URL_LOCAL.exec(salida)?.[1];
  return puerto === undefined ? null : Number(puerto);
}

/** La línea de acceso rápido: el nombre y la URL, con la flecha de Vite. */
export function lineaDeAcceso(nombre: string, puerto: number): string {
  return `  ➜  ${nombre}: http://localhost:${String(puerto)}/`;
}
