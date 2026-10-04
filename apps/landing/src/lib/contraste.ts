/*
 * Contraste de color según WCAG 2.x (https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio), para
 * comprobar que los pares de la landing cumplen la spec §11 con los tokens finales.
 */

/** Los canales de un color hex de 3 o 6 cifras, de 0 a 1. */
function canales(hex: string): [number, number, number] {
  const cifras = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex)?.[1];
  if (cifras === undefined) throw new Error(`"${hex}" no es un color hex de 3 o 6 cifras`);
  // `#fa0` es `#ffaa00`: cada cifra se duplica.
  const seis = cifras.length === 3 ? cifras.replace(/./g, '$&$&') : cifras;
  const n = parseInt(seis, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function lineal(canal: number): number {
  return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa de un color hex, de 0 (negro) a 1 (blanco). */
export function luminancia(hex: string): number {
  const [r, g, b] = canales(hex);
  return 0.2126 * lineal(r) + 0.7152 * lineal(g) + 0.0722 * lineal(b);
}

/** Relación de contraste entre dos colores hex, de 1 (iguales) a 21 (negro sobre blanco). */
export function contraste(a: string, b: string): number {
  const [la, lb] = [luminancia(a), luminancia(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Los tokens de un CSS que valen un color hex (`--nombre: #rrggbb;`), por nombre y sin los `--`.
 * Lo que no es hex (`rgb(...)`, tamaños) se salta.
 */
export function leerTokensHex(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  // `replaceAll` con un callback entrega los grupos ya como `string`; el resultado no se usa.
  css.replaceAll(
    /--([a-z0-9-]+)\s*:\s*(#[0-9a-f]{3}(?:[0-9a-f]{3})?)\s*;/gi,
    (coincidencia: string, nombre: string, valor: string) => {
      tokens.set(nombre, valor);
      return coincidencia;
    },
  );
  return tokens;
}
