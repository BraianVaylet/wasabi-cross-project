import { describe, expect, inject, it } from 'vitest';
import { atributo, imagenes, leer, principal, seccion, texto } from './html.ts';

/*
 * Las secciones Registro y Funciones (F10-06, spec §5.7) vistas en el HTML que sale del build.
 */

const html = principal(leer(inject('salida')));

describe('Registro', () => {
  const sec = seccion(html, 'registro');

  it('es una sección con nombre: su h2 la titula', () => {
    expect(sec).not.toBe('');
    const h2 = /<h2\b([^>]*)>([\s\S]*?)<\/h2>/.exec(sec);
    expect(atributo(`<x${h2?.[1] ?? ''}>`, 'id')).toBeDefined();
    expect(sec).toContain(`aria-labelledby="${atributo(`<x${h2?.[1] ?? ''}>`, 'id') ?? ''}"`);
  });

  it('el titular y el texto, en voseo', () => {
    const t = texto(sec);
    expect(texto(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(sec)?.[1] ?? '')).toBe(
      'Registrá ahora. Consultá el historial cuando quieras.',
    );
    expect(t).toContain(
      'Free incluye registro ilimitado de ejercicios y marcas, porcentajes de carga desde tu RM e historial por ejercicio. El análisis estadístico se suma con PRO.',
    );
    expect(t).toContain('El porcentaje de carga y el historial no se bloquean en Free.');
  });

  it('muestra las dos capturas, y las dos dicen en su pie que el progreso es de Pro', () => {
    expect(imagenes(sec)).toHaveLength(2);
    const pies = [...sec.matchAll(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g)].map((m) =>
      texto(m[1] ?? ''),
    );
    expect(pies).toHaveLength(2);
    for (const pie of pies) expect(pie).toMatch(/es de Pro/);
    expect(pies[0]).toMatch(/^PORCENTAJES — /);
    expect(pies[1]).toMatch(/^HISTORIAL — /);
  });
});

describe('Funciones', () => {
  const sec = seccion(html, 'funciones');

  it('es una sección con nombre', () => {
    expect(sec).not.toBe('');
    expect(sec).toMatch(/aria-labelledby="[^"]+"/);
  });

  it('el titular y el texto, en voseo y sin prometer evolución', () => {
    expect(texto(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(sec)?.[1] ?? '')).toBe(
      'Encontrá el ejercicio. Guardá la marca que toca.',
    );
    expect(texto(sec)).toContain(
      'Buscá en el catálogo por nombre y filtrá por disciplina. En los ejercicios de tiempo, registrá la marca y volvé a consultar tu historial.',
    );
  });

  it('muestra el catálogo y la carrera, y la carrera avisa que su progreso es de Pro', () => {
    expect(imagenes(sec)).toHaveLength(2);
    const pies = [...sec.matchAll(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g)].map((m) =>
      texto(m[1] ?? ''),
    );
    expect(pies[0]).toMatch(/^CATÁLOGO — /);
    expect(pies[1]).toMatch(/^CARRERA 5 KM — .*es de Pro/);
  });

  it('cierra con los tres resúmenes', () => {
    const t = texto(sec);
    for (const frase of [
      'Catálogo Buscá ejercicios por nombre y disciplina.',
      'Marcas Registrá RM, repeticiones, distancia o tiempo.',
      'Historial Consultá las marcas anteriores de cada ejercicio.',
    ]) {
      expect(t, frase).toContain(frase);
    }
  });
});

describe('la página', () => {
  it('el orden es hero, Registro y Funciones', () => {
    const posiciones = ['id="demo"', 'id="registro"', 'id="funciones"'].map((s) => html.indexOf(s));
    expect(posiciones.every((p) => p > 0)).toBe(true);
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones);
  });

  it('las anclas de la nav que ya tienen sección apuntan a algo', () => {
    for (const id of ['registro', 'funciones']) expect(html, id).toContain(`id="${id}"`);
  });

  it('todas las imágenes son lazy menos la del hero', () => {
    const todas = imagenes(html);
    expect(todas).toHaveLength(11);
    const eager = todas.filter((i) => atributo(i, 'loading') === 'eager');
    expect(eager).toHaveLength(1);
    expect(todas.filter((i) => atributo(i, 'loading') === 'lazy')).toHaveLength(10);
  });
});
