import { describe, expect, it } from 'vitest';
import { funciones } from '../src/content/funciones.ts';
import { registro } from '../src/content/registro.ts';

/*
 * Lo que dicen las secciones Registro y Funciones sobre Free y Pro (F10-06, spec §4 y §5.7).
 *
 * Estas dos secciones no están marcadas como Pro, así que no pueden prometer lo que sólo tiene Pro:
 * el progreso del detalle de un ejercicio, su "tendencia" o su "evolución". Y como las capturas son
 * de un usuario Pro (se ve la etiqueta PRO y el gráfico de progreso), el pie de cada una que lo
 * muestra tiene que decirlo.
 */

/** La forma que comparten las dos secciones; lo que tiene una y la otra no, es opcional. */
interface Seccion {
  titulo: readonly string[];
  descripcion: string;
  nota?: string;
  resumenes?: readonly { titulo: string; texto: string }[];
  capturas: Record<string, { alt: string; pie: string; muestraPro: boolean }>;
}

/** Todos los textos de una sección, el `alt` y el pie de las capturas incluidos. */
function textos(seccion: Seccion): string[] {
  return [
    ...seccion.titulo,
    seccion.descripcion,
    ...Object.values(seccion.capturas).flatMap((c) => [c.alt, c.pie]),
    ...(seccion.nota === undefined ? [] : [seccion.nota]),
    ...(seccion.resumenes ?? []).flatMap((r) => [r.titulo, r.texto]),
  ];
}

const secciones: Record<string, Seccion> = { registro, funciones };

describe('lo que Free no tiene, estas secciones no lo prometen', () => {
  for (const [nombre, seccion] of Object.entries(secciones)) {
    it(`${nombre}: ningún texto habla de "tendencia" ni de "evolución"`, () => {
      for (const t of textos(seccion)) {
        expect(t, t).not.toMatch(/tendencia|evoluci[oó]n/i);
      }
    });
  }

  it('registro: cada vez que habla de estadísticas, dice que son de PRO', () => {
    const oraciones = textos(registro).flatMap((t) => t.split(/(?<=[.!?])\s+/));
    const conEstadisticas = oraciones.filter((o) => /estad[ií]stic/i.test(o));
    expect(conEstadisticas.length).toBeGreaterThan(0);
    for (const o of conEstadisticas) expect(o, o).toMatch(/\bPRO\b/);
  });

  it('registro: afirma lo que sí tiene Free (spec §4)', () => {
    expect(registro.descripcion).toContain('registro ilimitado de ejercicios y marcas');
    expect(registro.descripcion).toContain('porcentajes de carga desde tu RM');
    expect(registro.descripcion).toContain('historial por ejercicio');
    expect(registro.nota).toBe('El porcentaje de carga y el historial no se bloquean en Free.');
  });
});

describe('las capturas', () => {
  const todas = [...Object.values(registro.capturas), ...Object.values(funciones.capturas)];

  it('las que muestran algo de Pro lo dicen en el pie', () => {
    const conPro = todas.filter((c) => c.muestraPro);
    expect(conPro.length).toBeGreaterThan(0);
    for (const c of conPro) expect(c.pie, c.pie).toMatch(/\bes de Pro\b/);
  });

  it('las que no, no lo dicen: el aviso es una afirmación y tiene que ser cierta', () => {
    for (const c of todas.filter((x) => !x.muestraPro))
      expect(c.pie, c.pie).not.toMatch(/\bde Pro\b/);
  });

  it('cada una tiene un alt propio que describe lo que se ve, no una copia del pie', () => {
    for (const c of todas) {
      expect(c.alt.length, c.alt).toBeGreaterThan(40);
      expect(c.alt.toLowerCase(), c.alt).not.toBe(c.pie.toLowerCase());
      expect(c.pie.toLowerCase(), c.pie).not.toContain(c.alt.toLowerCase());
    }
    const alts = todas.map((c) => c.alt);
    expect(new Set(alts).size).toBe(alts.length);
  });

  it('el pie empieza con su título en mayúsculas y un guion largo, como los del diseño', () => {
    for (const c of todas) expect(c.pie, c.pie).toMatch(/^[A-ZÁÉÍÓÚÑ0-9 ]+ — /);
  });
});

describe('funciones', () => {
  it('trae los tres resúmenes del diseño: catálogo, marcas e historial', () => {
    expect(funciones.resumenes.map((r) => r.titulo)).toEqual(['Catálogo', 'Marcas', 'Historial']);
  });
});
