import type { Presupuesto } from './ayudas.ts';

/*
 * El presupuesto de peso de la landing (F10-10), en bytes transferidos, por ancho de pantalla. Lo
 * que baja el navegador de `/`: el HTML, el CSS, las fuentes y las imágenes.
 *
 *   - `primeraVista`: hasta que la página terminó de cargar, sin bajar. Lo que ve quien llega.
 *   - `paginaEntera`: después de bajar hasta el final, con todas las capturas cargadas.
 *
 * Medido el 2026-10-11 sobre el build de F10-09 (con las tres capturas de más de Planes):
 *
 *   390 px   primera vista 198,6 KB (webp 107,3 · woff2 51,2 · css 20,1 · html 20,0)
 *            página entera 445,8 KB (webp 354,5)
 *   1280 px  primera vista 373,0 KB (webp 281,7)
 *            página entera 645,1 KB (webp 553,8)
 *
 * Cada tope es la medición más ~15 %: ajustado, para que una captura sin optimizar o una fuente de
 * más se note; con aire, para que un cambio de texto no lo rompa. La propuesta de partida del plan
 * (hero ≤ 150 KB) no entra: las fuentes, el CSS y el HTML ya son ~91 KB y la captura del hero, 107.
 * Cuando un cambio legítimo lo pasa, se mide de nuevo y se sube acá, con el motivo en el PR.
 */
const KB = 1024;

export const PRESUPUESTO: Record<'390' | '1280', Presupuesto> = {
  '390': { primeraVista: 230 * KB, paginaEntera: 515 * KB },
  '1280': { primeraVista: 430 * KB, paginaEntera: 745 * KB },
};
