import { describe, expect, inject, it } from 'vitest';
import { atributo, imagenes, leer, principal, seccion, texto } from './html.ts';

/*
 * La sección de estadísticas Pro (F10-07, spec §5.7) vista en el HTML que sale del build.
 */

const html = principal(leer(inject('salida')));
const sec = seccion(html, 'estadisticas');
const pies = [...sec.matchAll(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g)].map((m) =>
  texto(m[1] ?? ''),
);

describe('Estadísticas Pro', () => {
  it('es una sección con nombre, que se titula con su h2', () => {
    expect(sec).not.toBe('');
    const h2 = /<h2\b([^>]*)>/.exec(sec)?.[1] ?? '';
    expect(sec).toContain(`aria-labelledby="${atributo(`<x${h2}>`, 'id') ?? ''}"`);
  });

  it('el titular y el texto dicen que las estadísticas son de Pro', () => {
    expect(texto(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(sec)?.[1] ?? '')).toBe(
      'Pro suma estadísticas a tus registros.',
    );
    expect(texto(sec)).toContain(
      'Revisá la evolución de cada ejercicio y consultá una lectura general de tu actividad, tus capacidades y tus grupos musculares.',
    );
    expect(texto(sec)).toContain('PRO · ESTADÍSTICAS');
  });

  it('el bloque de constancia y retestear', () => {
    expect(texto(/<h3\b[^>]*>([\s\S]*?)<\/h3>/.exec(sec)?.[1] ?? '')).toBe(
      'Constancia y ejercicios para volver a testear.',
    );
    expect(texto(sec)).toContain('más de ocho semanas');
  });

  it('muestra las seis capturas, con sus pies en el orden del diseño', () => {
    expect(imagenes(sec)).toHaveLength(6);
    expect(pies.map((p) => p.split(' — ')[0])).toEqual([
      'ESTADÍSTICAS',
      'POR EJERCICIO',
      'EN GENERAL',
      'TU ENTRENAMIENTO',
      'CONSTANCIA',
      'PARA RETESTEAR',
    ]);
  });

  it('todas traen sus dimensiones, y son lazy: están bajo el pliegue', () => {
    for (const img of imagenes(sec)) {
      expect(atributo(img, 'width'), img).toMatch(/^\d+$/);
      expect(atributo(img, 'height'), img).toMatch(/^\d+$/);
      expect(atributo(img, 'loading')).toBe('lazy');
      expect(atributo(img, 'alt')?.length).toBeGreaterThan(40);
    }
  });
});

describe('la página', () => {
  it('el orden es hero, Registro, Funciones y Estadísticas', () => {
    const ids = ['id="demo"', 'id="registro"', 'id="funciones"', 'id="estadisticas"'];
    const posiciones = ids.map((s) => html.indexOf(s));
    expect(posiciones.every((p) => p > 0)).toBe(true);
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones);
  });
});
