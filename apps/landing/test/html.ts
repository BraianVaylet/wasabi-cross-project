import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* Ayudas para leer el HTML que sale del build en los tests de las secciones. */

export const leer = (dir: string, archivo = 'index.html'): string =>
  readFileSync(join(dir, archivo), 'utf8');

/** Lo que está dentro de <main>. */
export const principal = (html: string): string =>
  /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] ?? '';

/** El texto de un fragmento de HTML, sin etiquetas y con los espacios normalizados. */
export const texto = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Una <section> por su id, o '' si no está. */
export function seccion(html: string, id: string): string {
  return (
    new RegExp(`<section\\b[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?</section>`).exec(html)?.[0] ?? ''
  );
}

/** Las etiquetas <img> de un fragmento. */
export const imagenes = (html: string): string[] =>
  [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);

/** El valor de un atributo de una etiqueta, o undefined. */
export const atributo = (etiqueta: string, nombre: string): string | undefined =>
  new RegExp(`\\s${nombre}="([^"]*)"`).exec(etiqueta)?.[1];
