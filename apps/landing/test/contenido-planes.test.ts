import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { canViewStats, planSchema } from '@wasabi-cross/schemas';
import type * as Schemas from '@wasabi-cross/schemas';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { planes } from '../src/content/plans.ts';

/*
 * Lo que dice la sección de planes (F10-08, spec §4 y §5.7). Es lo que se promete sobre el plan
 * pago: si dice lo que la app no hace, es publicidad engañosa. Por eso las tres reglas son
 * cruzadas: la fila de estadísticas sale de `canViewStats` (la misma regla que hace cumplir la
 * API), el precio sigue "por definir" mientras la spec y la app lo digan, y lo que Free tiene es
 * lo que dice la tabla de §4.
 */

const RAIZ = resolve(import.meta.dirname, '..', '..', '..');
const leerArchivo = (...ruta: string[]): string => readFileSync(resolve(RAIZ, ...ruta), 'utf8');

const SPEC = leerArchivo('docs', 'spec', 'wasabi-cross.spec.md');
const PLANS_WEB = leerArchivo('apps', 'web', 'src', 'lib', 'plans.ts');
const PLANS_LANDING = leerArchivo('apps', 'landing', 'src', 'content', 'plans.ts');

const filasDe = (tipo: 'registro' | 'estadisticas', contenido: typeof planes = planes) =>
  contenido.tabla.filas.filter((f) => f.tipo === tipo);

describe('la tabla sale de `canViewStats`', () => {
  it('tiene cinco filas: tres de registro y dos de estadísticas', () => {
    expect(planes.tabla.filas).toHaveLength(5);
    expect(filasDe('registro')).toHaveLength(3);
    expect(filasDe('estadisticas')).toHaveLength(2);
  });

  it('las filas de estadísticas dicen "Incluidas" sólo en el plan para el que canViewStats da true', () => {
    for (const fila of filasDe('estadisticas')) {
      for (const plan of planSchema.options) {
        expect(fila.valores[plan], `${fila.etiqueta} · ${plan}`).toBe(
          canViewStats(plan) ? 'Incluidas' : '—',
        );
      }
    }
  });

  it('hoy eso quiere decir: Free no las incluye y Pro sí', () => {
    for (const fila of filasDe('estadisticas')) {
      expect(fila.valores).toEqual({ free: '—', pro: 'Incluidas' });
    }
  });

  it('las filas de registro dicen "Sí" en los dos planes', () => {
    for (const fila of filasDe('registro')) {
      expect(fila.valores).toEqual({ free: 'Sí', pro: 'Sí' });
    }
  });

  it('las filas de registro son las de la spec §4: Free carga sin límite', () => {
    expect(SPEC).toMatch(
      /\*\*Free\*\*\s*\|\s*Los que quiera\s*\|\s*Todas las que quiera\s*\|\s*No\s*\|/,
    );
    expect(SPEC).toMatch(
      /\*\*Pro\*\*\s*\|\s*Los que quiera\s*\|\s*Todas las que quiera\s*\|\s*Sí\s*\|/,
    );
  });
});

describe('prueba inversa: si la regla cambia, la tabla cambia con ella', () => {
  afterEach(() => {
    vi.doUnmock('@wasabi-cross/schemas');
    vi.resetModules();
  });

  it('con canViewStats al revés, "Incluidas" pasa a Free y Pro queda con "—"', async () => {
    vi.resetModules();
    vi.doMock('@wasabi-cross/schemas', async (original) => {
      const real = await original<typeof Schemas>();
      return { ...real, canViewStats: (plan: Schemas.Plan) => plan === 'free' };
    });
    const { planes: alReves } = await import('../src/content/plans.ts');
    for (const fila of filasDe('estadisticas', alReves)) {
      expect(fila.valores).toEqual({ free: 'Incluidas', pro: '—' });
    }
    // Lo de registro no depende de esa regla.
    for (const fila of filasDe('registro', alReves)) {
      expect(fila.valores).toEqual({ free: 'Sí', pro: 'Sí' });
    }
  });
});

describe('el precio de Pro', () => {
  it('la spec lo deja a definir', () => {
    expect(SPEC).toMatch(/El monto de Pro está \*\*a definir\*\*/);
  });

  it('la app también lo dice "A definir"', () => {
    expect(PLANS_WEB).toMatch(/price: 'A definir'/);
  });

  it('la tarjeta dice "Suscripción · precio por definir", sin período ni monto', () => {
    expect(planes.tarjetas.pro.precio).toBe('Suscripción · precio por definir');
    expect(planes.tarjetas.pro.precio).not.toMatch(/anual|mensual|\d|\$/i);
  });

  it('ningún texto de la sección habla de un período', () => {
    expect(JSON.stringify(planes)).not.toMatch(/anual|mensual/i);
  });

  it('el texto comercial duplicado queda anotado en los dos archivos', () => {
    expect(PLANS_LANDING).toContain('apps/web/src/lib/plans.ts');
    expect(PLANS_WEB).toContain('apps/landing/src/content/plans.ts');
  });
});

describe('qué promete cada tarjeta', () => {
  it('la de Free no promete estadísticas ni su evolución', () => {
    const { etiqueta, texto } = planes.tarjetas.free;
    expect(`${etiqueta} ${texto}`).not.toMatch(/estad[ií]stic|tendencia|evoluci|progreso/i);
  });

  it('la de Free sí promete lo que tiene: registro, porcentajes e historial de marcas', () => {
    const { texto } = planes.tarjetas.free;
    for (const frase of ['Ejercicios', 'marcas', 'porcentajes de carga', 'historial de marcas']) {
      expect(texto, frase).toContain(frase);
    }
  });

  it('la de Pro nombra las estadísticas', () => {
    const { etiqueta, texto } = planes.tarjetas.pro;
    expect(`${etiqueta} ${texto}`).toMatch(/estad[ií]sticas/i);
  });

  it('el titular y la descripción dicen que Free registra y Pro suma estadísticas', () => {
    expect(planes.titulo).toEqual(['Registro completo en Free.', 'Estadísticas extra en Pro.']);
    expect(planes.descripcion).toContain('Pro suma las estadísticas');
  });
});

describe('las dos capturas', () => {
  const capturas = Object.values(planes.capturas);

  it('son dos: lo que ve Free y la pantalla de suscripción', () => {
    expect(capturas).toHaveLength(2);
  });

  it('cada una tiene un alt propio que describe lo que se ve, no una copia del pie', () => {
    for (const c of capturas) {
      expect(c.alt.length, c.alt).toBeGreaterThan(40);
      expect(c.pie.toLowerCase(), c.pie).not.toContain(c.alt.toLowerCase());
    }
    expect(new Set(capturas.map((c) => c.alt)).size).toBe(capturas.length);
  });

  it('el pie empieza con su título en mayúsculas y un guion largo, como los del diseño', () => {
    for (const c of capturas) expect(c.pie, c.pie).toMatch(/^[A-ZÁÉÍÓÚÑ0-9 ]+ — /);
  });

  it('el pie de la suscripción avisa que la captura es de una cuenta Pro', () => {
    expect(planes.capturas.suscripcion.pie).toContain('cuenta Pro');
  });
});
