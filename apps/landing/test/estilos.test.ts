import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { beforeAll, describe, expect, inject, it } from 'vitest';

/*
 * Tipografías y colores (F10-02, spec §6, §11 y §13): las fuentes salen del propio origen, no se
 * pide nada a otro host y ningún color se escribe a mano fuera de los tokens.
 */

const salida = inject('salida');
const SRC = resolve(import.meta.dirname, '..', 'src');

async function listar(dir: string): Promise<string[]> {
  const entradas = await readdir(dir, { withFileTypes: true, recursive: true });
  return entradas.filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name));
}

describe('salida del build', () => {
  let archivos: string[] = [];
  let css = '';
  let html = '';

  beforeAll(async () => {
    archivos = await listar(salida);
    const hojas = archivos.filter((a) => a.endsWith('.css'));
    css = (await Promise.all(hojas.map((h) => readFile(h, 'utf8')))).join('\n');
    html = await readFile(join(salida, 'index.html'), 'utf8');
  });

  describe('tipografías', () => {
    const familias = [
      { nombre: 'Staatliches', pesos: ['400'] },
      { nombre: 'Share Tech Mono', pesos: ['400'] },
      { nombre: 'Figtree', pesos: ['400', '500', '600', '700'] },
    ];

    for (const { nombre, pesos } of familias) {
      it(`${nombre}: un @font-face por peso (${pesos.join(', ')}), con font-display: swap`, () => {
        const bloques = (css.match(/@font-face\s*{[^}]*}/g) ?? []).filter((b) =>
          new RegExp(`font-family:\\s*["']?${nombre}["']?[;}]`, 'i').test(b),
        );
        const encontrados = bloques.map((b) => /font-weight:\s*(\d+)/.exec(b)?.[1]).sort();
        expect(encontrados).toEqual([...pesos].sort());
        for (const bloque of bloques) {
          expect(bloque).toMatch(/font-display:\s*swap/);
        }
      });
    }

    it('todos los src: url() del @font-face son del propio origen', () => {
      const bloques = css.match(/@font-face\s*{[^}]*}/g) ?? [];
      const urls = bloques.flatMap((b) =>
        [...b.matchAll(/url\(\s*["']?([^)"']+)/g)].map((m) => m[1]),
      );
      expect(urls.length).toBeGreaterThan(0);
      for (const url of urls) {
        expect(url).toMatch(/^\/(?!\/)/);
      }
    });

    it('sólo baja el subconjunto latin: alcanza para el español', () => {
      expect(archivos.filter((a) => /latin-ext|cyrillic|vietnamese|greek/.test(a))).toEqual([]);
    });

    it('precarga la de los titulares, y el archivo existe', () => {
      const enlaces = [...html.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]);
      const precarga = enlaces.find(
        (e) => e.includes('rel="preload"') && e.includes('as="font"') && e.includes('staatliches'),
      );
      expect(precarga, 'falta el <link rel="preload" as="font"> de Staatliches').toBeDefined();
      expect(precarga).toMatch(/crossorigin/);
      expect(precarga).toMatch(/type="font\/woff2"/);
      const href = /href="([^"]+)"/.exec(precarga ?? '')?.[1] ?? '';
      expect(archivos).toContain(join(salida, ...href.split('/').filter(Boolean)));
    });
  });

  describe('sin recursos de otros orígenes', () => {
    it('ni el HTML ni el CSS piden nada a otro host', () => {
      const textos = [html, css];
      for (const texto of textos) {
        const externos = [...texto.matchAll(/(?:https?:)?\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi)]
          .map((m) => m[0])
          // Un namespace de SVG no es un pedido.
          .filter((u) => !u.includes('//www.w3.org'));
        expect(externos).toEqual([]);
      }
    });
  });
});

describe('colores', () => {
  // Hex, o una función de color con números: lo que se escribe a mano en vez de un `var(--wc-*)`.
  const SUELTO = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;

  /** El CSS de un archivo: todo si es .css; los <style> y los style="" si es .astro. */
  function cssDe(archivo: string, texto: string): string {
    if (archivo.endsWith('.css')) return texto;
    if (!archivo.endsWith('.astro')) return '';
    const bloques = [...texto.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
    const enLinea = [...texto.matchAll(/\bstyle=(?:"([^"]*)"|'([^']*)')/g)].map(
      (m) => m[1] ?? m[2],
    );
    return [...bloques, ...enLinea].join('\n');
  }

  it('ninguno fuera de los tokens (src/styles/tokens.css)', async () => {
    const sueltos: string[] = [];
    for (const archivo of await listar(SRC)) {
      const rel = relative(SRC, archivo).replaceAll('\\', '/');
      if (rel === 'styles/tokens.css') continue;
      const css = cssDe(archivo, await readFile(archivo, 'utf8'));
      for (const m of css.matchAll(SUELTO)) sueltos.push(`${rel}: ${m[0]}`);
    }
    expect(sueltos).toEqual([]);
  });
});

describe('titulares', () => {
  it('el interlineado deja pasar la tilde de las mayúsculas: no baja de 1.05', async () => {
    // Con el 0.98 del diseño, la tilde de la "Í" de ESTADÍSTICAS tocaba la letra de la línea de arriba.
    const global = await readFile(join(SRC, 'styles', 'global.css'), 'utf8');
    const bloque = /\.titulo-seccion\s*{([^}]*)}/.exec(global)?.[1] ?? '';
    const interlineado = Number(/line-height:\s*([\d.]+)\s*;/.exec(bloque)?.[1]);
    expect(interlineado).toBeGreaterThanOrEqual(1.05);
  });
});
