import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// La marca vive en `@wasabi-cross/ui`, pero la librería se resuelve desde su `dist` y no la
// exporta (es del logo, no de la API de componentes): acá se lee directo de su fuente.
import { ESCALAS, svgDeLaMarca } from '../../../../packages/ui/src/components/logo/marca.ts';

/*
 * Los archivos del logo en `public/` los genera `pnpm --filter @wasabi-cross/web icons` a partir de
 * `marca.ts`. Los PNG y el .ico no se pueden comparar, pero el SVG sí: si cambia la marca y nadie
 * regenera, este test lo avisa.
 */

// Con `import.meta.dirname` y no con `new URL(…)`: en jsdom `URL` no es el de Node y `fs` no lo acepta.
const raiz = resolve(import.meta.dirname, '../..');
const publico = (archivo: string): string => resolve(raiz, 'public', archivo);

describe('el logo publicado', () => {
  it('logo.svg es la marca de marca.ts: si no coincide, falta correr `pnpm icons`', () => {
    const publicado = readFileSync(publico('logo.svg'), 'utf8');

    expect(publicado).toBe(svgDeLaMarca({ esquinas: true, escala: ESCALAS.icono }));
  });

  it('index.html enlaza el favicon y el apple-touch que existen en public/', () => {
    const html = readFileSync(resolve(raiz, 'index.html'), 'utf8');
    const enlaces = [
      ...html.matchAll(/<link rel="(?:icon|apple-touch-icon)"[^>]*href="\/([^"]+)"/g),
    ].map(([, archivo]) => archivo ?? '');

    expect(enlaces).toEqual(['favicon.ico', 'logo.svg', 'apple-touch-icon.png']);
    for (const archivo of enlaces) {
      expect(existsSync(publico(archivo)), archivo).toBe(true);
    }
  });

  it('los PNG de la PWA existen y son PNG', () => {
    const firmaPng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

    for (const archivo of [
      'icons/icon-192.png',
      'icons/icon-512.png',
      'icons/icon-maskable-512.png',
      'apple-touch-icon.png',
    ]) {
      expect(readFileSync(publico(archivo)).subarray(0, 4).equals(firmaPng), archivo).toBe(true);
    }
  });

  it('favicon.ico trae los tamaños 16, 32 y 48', () => {
    const ico = readFileSync(publico('favicon.ico'));
    const cantidad = ico.readUInt16LE(4);
    const lados = Array.from({ length: cantidad }, (_, i) => ico.readUInt8(6 + 16 * i));

    // El primer par de bytes es el encabezado: 0 reservado, 1 = ícono.
    expect([ico.readUInt16LE(0), ico.readUInt16LE(2)]).toEqual([0, 1]);
    expect(lados).toEqual([16, 32, 48]);
  });
});
