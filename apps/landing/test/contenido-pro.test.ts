import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { estadisticas } from '../src/content/estadisticas.ts';

/*
 * Lo que dice la sección de estadísticas (F10-07, spec §4 y §5.4). A diferencia de Registro y
 * Funciones, ésta SÍ es de Pro y lo dice: puede hablar de la evolución. Lo que no puede es
 * afirmar algo que la spec no dice, y menos el umbral de "para retestear".
 */

const SPEC = readFileSync(
  resolve(import.meta.dirname, '..', '..', '..', 'docs', 'spec', 'wasabi-cross.spec.md'),
  'utf8',
);
const capturas = Object.values(estadisticas.capturas);

describe('la sección dice que es de Pro', () => {
  it('el titular y la etiqueta nombran a Pro', () => {
    expect(estadisticas.titulo.join(' ')).toMatch(/\bPro\b/);
    expect(estadisticas.etiqueta).toMatch(/\bPRO\b/);
  });

  it('nombra lo que incluye: por ejercicio, lo general, constancia, récords y para retestear', () => {
    const t = [estadisticas.descripcion, estadisticas.retestear.descripcion].join(' ');
    for (const frase of [
      'evolución de cada ejercicio',
      'capacidades',
      'grupos musculares',
      'récords',
      'más de ocho semanas',
    ]) {
      expect(t, frase).toContain(frase);
    }
  });
});

describe('el umbral de "para retestear" es el de la spec §5.4', () => {
  it('la spec dice más de 8 semanas (56 días)', () => {
    expect(SPEC).toMatch(/\*\*más de 8 semanas\*\*\s*\(56 días\)/);
  });

  it('el texto dice "más de ocho semanas", que son esos 56 días', () => {
    expect(estadisticas.retestear.descripcion).toContain('más de ocho semanas');
    expect(estadisticas.retestear.semanas * 7).toBe(56);
    expect(estadisticas.retestear.semanas).toBe(8);
  });
});

describe('las seis capturas', () => {
  it('son seis', () => {
    expect(capturas).toHaveLength(6);
  });

  it('cada una tiene un alt propio que describe lo que se ve, no una copia del pie', () => {
    for (const c of capturas) {
      expect(c.alt.length, c.alt).toBeGreaterThan(40);
      expect(c.pie.toLowerCase(), c.pie).not.toContain(c.alt.toLowerCase());
    }
    const alts = capturas.map((c) => c.alt);
    expect(new Set(alts).size).toBe(alts.length);
  });

  it('el pie empieza con su título en mayúsculas y un guion largo, como los del diseño', () => {
    for (const c of capturas) expect(c.pie, c.pie).toMatch(/^[A-ZÁÉÍÓÚÑ0-9 ]+ — /);
  });

  it('el alt de la de constancia dice lo que muestra la imagen: los días desde la última marca, no una fecha', () => {
    const { alt } = estadisticas.capturas.constancia;
    expect(alt).toContain('hace 7 días');
    expect(alt).not.toMatch(/fecha de (la )?última/i);
    expect(alt).toMatch(/más mejoraron/);
  });
});
