import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contraste, leerTokensHex, luminancia } from '../src/lib/contraste.ts';

/*
 * Contraste WCAG 2.2 AA (spec §11) de los pares que usa el diseño de la landing, calculado sobre
 * los tokens finales. Es la fuente de verdad: los números del comentario de `tokens.css` salen de
 * acá, y si un token se mueve y un par baja del umbral, este test falla.
 */

const ESTILOS = resolve(import.meta.dirname, '..', 'src', 'styles');
const UI = resolve(import.meta.dirname, '..', '..', '..', 'packages', 'ui', 'src', 'styles');

const tokens = new Map([
  ...leerTokensHex(readFileSync(resolve(UI, 'tokens.css'), 'utf8')),
  ...leerTokensHex(readFileSync(resolve(ESTILOS, 'tokens.css'), 'utf8')),
]);

function color(nombre: string): string {
  const valor = tokens.get(nombre);
  if (valor === undefined) throw new Error(`falta el token --${nombre}`);
  return valor;
}

describe('contraste()', () => {
  it('da 21:1 entre negro y blanco, y 1:1 entre un color y él mismo', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contraste('#a7dd4f', '#a7dd4f')).toBeCloseTo(1, 5);
  });

  it('no depende del orden de los colores', () => {
    expect(contraste('#0f041c', '#a7dd4f')).toBeCloseTo(contraste('#a7dd4f', '#0f041c'), 10);
  });

  it('acepta mayúsculas y la forma corta', () => {
    expect(contraste('#FFF', '#000')).toBeCloseTo(21, 5);
  });

  it('rechaza lo que no es un hex de 3 o 6 cifras', () => {
    expect(() => luminancia('rojo')).toThrow(/hex/);
    expect(() => luminancia('#12345')).toThrow(/hex/);
  });
});

describe('leerTokensHex()', () => {
  it('lee las declaraciones hex y se salta lo que no lo es', () => {
    const css = `:root { --a: #fff; --b: rgb(0 0 0 / 40%); --c-d: #A7DD4F; --e: 10px; }`;
    expect([...leerTokensHex(css)]).toEqual([
      ['a', '#fff'],
      ['c-d', '#A7DD4F'],
    ]);
  });
});

describe('pares de la landing', () => {
  const superficies = ['wc-bg', 'wc-bg-band', 'wc-surface', 'wc-surface-pro'] as const;
  const textos = [
    'wc-text',
    'wc-text-body',
    'wc-text-soft',
    'wc-text-muted',
    'wc-text-dim',
    'wc-accent',
    'wc-pro-text',
  ] as const;

  // Todo texto sobre toda superficie, aunque el diseño no use cada combinación: así el próximo
  // componente no necesita revisar el contraste a mano.
  for (const superficie of superficies) {
    for (const texto of textos) {
      it(`${texto} sobre ${superficie}: texto, ≥ 4,5:1`, () => {
        const ratio = contraste(color(texto), color(superficie));
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('el texto oscuro sobre el acento (el botón) pasa AA', () => {
    expect(contraste(color('wc-text-on-accent'), color('wc-accent'))).toBeGreaterThanOrEqual(4.5);
  });

  it('el texto oscuro sobre el rosa de Pro (la etiqueta) pasa AA', () => {
    expect(contraste(color('wc-text-on-accent'), color('wc-pro'))).toBeGreaterThanOrEqual(4.5);
  });

  it('el foco se distingue del fondo: no-texto, ≥ 3:1', () => {
    for (const superficie of superficies) {
      expect(contraste(color('wc-focus'), color(superficie))).toBeGreaterThanOrEqual(3);
    }
  });
});
