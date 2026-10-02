import { describe, expect, it } from 'vitest';
import { COLORES, ESCALAS, FORMAS, LADO, svgDeLaMarca } from './marca.ts';

/** Todos los vértices de la marca, ya escalados desde el centro del lienzo. */
function vertices(escala: number): [number, number][] {
  const centro = LADO / 2;
  return FORMAS.flatMap((forma) =>
    [...forma.d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(([, x, y]): [number, number] => [
      centro + (Number(x) - centro) * escala,
      centro + (Number(y) - centro) * escala,
    ]),
  );
}

describe('la marca', () => {
  it('es una W blanca: cuatro trazos y nada más', () => {
    expect(COLORES.letra).toBe('#ffffff');
    expect(FORMAS).toHaveLength(4);
  });

  it('va sobre un fondo verde', () => {
    const [rojo = 0, verde = 0, azul = 0] = [1, 3, 5].map((i) =>
      parseInt(COLORES.fondo.slice(i, i + 2), 16),
    );

    expect(verde).toBeGreaterThan(rojo);
    expect(verde).toBeGreaterThan(azul);
  });

  it('con la escala del ícono queda dentro del lienzo, sin tocar los bordes', () => {
    const margen = LADO * 0.05;

    for (const [x, y] of vertices(ESCALAS.icono)) {
      expect(x).toBeGreaterThan(margen);
      expect(x).toBeLessThan(LADO - margen);
      expect(y).toBeGreaterThan(margen);
      expect(y).toBeLessThan(LADO - margen);
    }
  });

  it('con la escala segura queda dentro del círculo central del 80%: el sistema no la recorta', () => {
    const radioSeguro = LADO * 0.4;

    for (const [x, y] of vertices(ESCALAS.segura)) {
      expect(Math.hypot(x - LADO / 2, y - LADO / 2)).toBeLessThanOrEqual(radioSeguro);
    }
  });
});

describe('svgDeLaMarca', () => {
  const parsear = (svg: string): Document => new DOMParser().parseFromString(svg, 'image/svg+xml');

  it('es un SVG válido, cuadrado, con el fondo y los cuatro trazos de la W', () => {
    const documento = parsear(svgDeLaMarca({ esquinas: true, escala: 1 }));
    const raiz = documento.documentElement;

    expect(documento.querySelector('parsererror')).toBeNull();
    expect(raiz.tagName).toBe('svg');
    expect(raiz.getAttribute('viewBox')).toBe(`0 0 ${String(LADO)} ${String(LADO)}`);
    expect(documento.querySelector('rect')?.getAttribute('fill')).toBe(COLORES.fondo);
    expect(documento.querySelectorAll('path')).toHaveLength(FORMAS.length);
  });

  it('con esquinas redondea el fondo; sin ellas va a sangre, para que el sistema lo recorte', () => {
    const redondeado = parsear(svgDeLaMarca({ esquinas: true, escala: 1 }));
    const aSangre = parsear(svgDeLaMarca({ esquinas: false, escala: 1 }));

    expect(Number(redondeado.querySelector('rect')?.getAttribute('rx'))).toBeGreaterThan(0);
    expect(aSangre.querySelector('rect')?.hasAttribute('rx')).toBe(false);
  });

  it('la escala agranda la marca desde el centro del lienzo', () => {
    const documento = parsear(svgDeLaMarca({ esquinas: true, escala: 1.5 }));

    expect(documento.querySelector('g')?.getAttribute('transform')).toContain('scale(1.5)');
  });
});
