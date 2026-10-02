/*
 * La marca: una "W" blanca sobre un fondo verde.
 *
 * Una sola definición para todo lo que dibuja el logo: el componente `Logo` y los íconos de
 * `apps/web/public` (favicon, PWA, apple-touch), que genera `apps/web/scripts/generar-iconos.ts`.
 * Sin imports, para que el script la cargue directo con Node.
 *
 * La letra se arma con polígonos, no con texto: no depende de ninguna tipografía y se ve
 * igual en cualquier rasterizador.
 */

/** El lado del lienzo cuadrado en el que están dibujadas las formas. */
export const LADO = 512;

/** Los colores son del logo, no del tema: el ícono instalado y el del header tienen que coincidir. */
export const COLORES = {
  /** El acento de la app (`--wc-accent`, `styles/tokens.css`). */
  fondo: '#a7dd4f',
  letra: '#ffffff',
} as const;

export interface Forma {
  /** Contorno cerrado, en coordenadas del lienzo de `LADO`. */
  d: string;
  relleno: (typeof COLORES)['letra'];
}

/** El radio de las esquinas de la versión "any"; el maskable y el apple-touch van a sangre. */
export const RADIO_ESQUINA = 96;

// --- Medidas, sobre el lienzo de 512. Todo lo demás se calcula a partir de acá. ---

/** Alto de la W. */
const ALTO = 250;
/** Grosor horizontal del trazo. */
const GROSOR = 54;
/** Cuánto se corre la W en horizontal entre una diagonal y la que sigue. */
const PASO = 62;
/** Dónde queda la punta del medio, desde el borde de arriba: que no se lea como "VV". */
const PUNTA = 74;

const ANCHO = 4 * PASO + GROSOR;
const IZQUIERDA = (LADO - ANCHO) / 2;
const ARRIBA = (LADO - ALTO) / 2;
const ABAJO = ARRIBA + ALTO;

const r = (n: number): string => String(Math.round(n * 100) / 100);
const punto = (x: number, y: number): string => `${r(x)} ${r(y)}`;

/** Un trazo inclinado con los extremos cortados a ras: de (xa, ya) a (xb, yb), de grosor `g`. */
function trazo(xa: number, ya: number, xb: number, yb: number, g: number): string {
  const m = g / 2;
  return `M${punto(xa - m, ya)}L${punto(xa + m, ya)}L${punto(xb + m, yb)}L${punto(xb - m, yb)}Z`;
}

function construirW(): Forma[] {
  const x0 = IZQUIERDA + GROSOR / 2;
  const punta = ARRIBA + PUNTA;
  // Cuatro trazos que se pisan en los vértices: el relleno es el mismo, así que se unen solos y
  // la punta del medio y los dos vértices de abajo quedan cortados a ras.
  const trazos = [
    trazo(x0, ARRIBA, x0 + PASO, ABAJO, GROSOR),
    trazo(x0 + PASO, ABAJO, x0 + 2 * PASO, punta, GROSOR),
    trazo(x0 + 2 * PASO, punta, x0 + 3 * PASO, ABAJO, GROSOR),
    trazo(x0 + 3 * PASO, ABAJO, x0 + 4 * PASO, ARRIBA, GROSOR),
  ];
  return trazos.map((d) => ({ d, relleno: COLORES.letra }));
}

/** Las formas de la marca, centradas en el lienzo y a su tamaño base (59% del ancho). */
export const FORMAS: readonly Forma[] = construirW();

/**
 * Cuánto se agranda la marca desde el centro del lienzo, según dónde va. `icono` es la de los
 * íconos redondeados y la del `Logo` de la app; `segura`, la de los que el sistema recorta con su
 * propia máscara (maskable, apple-touch): deja la marca dentro del círculo central del 80%.
 */
export const ESCALAS = { icono: 1.15, segura: 1 } as const;

/** El `transform` de SVG que aplica una escala sobre el centro del lienzo. */
export function transformDeEscala(escala: number): string {
  const centro = String(LADO / 2);
  const opuesto = String(-LADO / 2);
  return `translate(${centro} ${centro}) scale(${String(escala)}) translate(${opuesto} ${opuesto})`;
}

/** El SVG completo, como texto: el `logo.svg` y lo que se rasteriza a PNG/ICO. */
export function svgDeLaMarca(opciones: { esquinas: boolean; escala: number }): string {
  const { esquinas, escala } = opciones;
  const lado = String(LADO);
  const formas = FORMAS.map((f) => `<path fill="${f.relleno}" d="${f.d}"/>`).join('');
  const rx = esquinas ? ` rx="${String(RADIO_ESQUINA)}"` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" width="${lado}" height="${lado}">` +
    `<rect width="${lado}" height="${lado}"${rx} fill="${COLORES.fondo}"/>` +
    `<g transform="${transformDeEscala(escala)}">${formas}</g>` +
    `</svg>`
  );
}
