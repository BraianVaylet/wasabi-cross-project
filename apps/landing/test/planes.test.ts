import { canViewStats, planSchema } from '@wasabi-cross/schemas';
import { describe, expect, inject, it } from 'vitest';
import { atributo, imagenes, leer, principal, seccion, texto } from './html.ts';

/*
 * La sección de planes (F10-08, spec §4 y §5.7) vista en el HTML que sale del build: la tabla
 * comparativa como `<table>` de verdad, el contenedor que la desplaza alcanzable por teclado, las
 * dos tarjetas y las dos capturas.
 */

const html = principal(leer(inject('salida')));
const sec = seccion(html, 'planes');
const tabla = /<table\b[\s\S]*?<\/table>/.exec(sec)?.[0] ?? '';
const filas = [...tabla.matchAll(/<tr\b[\s\S]*?<\/tr>/g)].map((m) => m[0]);
const filasDeCuerpo = filas.filter((f) => f.includes('scope="row"'));
const celdas = (fila: string): string[] =>
  [...fila.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((m) => texto(m[1] ?? ''));
const tarjeta = (plan: string): string =>
  new RegExp(`<article\\b[^>]*data-plan="${plan}"[^>]*>[\\s\\S]*?</article>`).exec(sec)?.[0] ?? '';
const pies = [...sec.matchAll(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/g)].map((m) =>
  texto(m[1] ?? ''),
);

describe('la sección', () => {
  it('es una sección con nombre, que se titula con su h2', () => {
    expect(sec).not.toBe('');
    const h2 = /<h2\b([^>]*)>/.exec(sec)?.[1] ?? '';
    expect(sec).toContain(`aria-labelledby="${atributo(`<x${h2}>`, 'id') ?? ''}"`);
  });

  it('el titular y la descripción', () => {
    expect(texto(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(sec)?.[1] ?? '')).toBe(
      'Registro completo en Free. Estadísticas extra en Pro.',
    );
    expect(texto(sec)).toContain('Pro suma las estadísticas');
  });

  it('es el destino de la nav y va después de las estadísticas', () => {
    const ids = [
      'id="demo"',
      'id="registro"',
      'id="funciones"',
      'id="estadisticas"',
      'id="planes"',
    ];
    const posiciones = ids.map((s) => html.indexOf(s));
    expect(posiciones.every((p) => p > 0)).toBe(true);
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones);
  });
});

describe('la tabla comparativa', () => {
  it('es una <table> con <caption>, y el caption es lo primero que tiene', () => {
    expect(tabla).not.toBe('');
    const caption = /<table\b[^>]*>\s*<caption\b[^>]*>([\s\S]*?)<\/caption>/.exec(tabla);
    expect(texto(caption?.[1] ?? '')).toBe('Comparación de funciones de Free y Pro');
  });

  it('los encabezados de columna llevan scope="col": funciones, Free y Pro', () => {
    const cabeza = /<thead\b[\s\S]*?<\/thead>/.exec(tabla)?.[0] ?? '';
    const ths = [...cabeza.matchAll(/<th\b([^>]*)>([\s\S]*?)<\/th>/g)];
    expect(ths.map((m) => texto(m[2] ?? ''))).toEqual(['Funciones', 'Free', 'Pro']);
    for (const m of ths) expect(m[1]).toContain('scope="col"');
  });

  it('cada fila tiene su encabezado scope="row" y una celda por plan', () => {
    expect(filasDeCuerpo).toHaveLength(5);
    for (const fila of filasDeCuerpo) {
      expect(/<th\b[^>]*scope="row"[^>]*>/.exec(fila)).not.toBeNull();
      expect(celdas(fila)).toHaveLength(planSchema.options.length);
    }
  });

  it('las tres primeras filas dicen "Sí" y "Sí"', () => {
    for (const fila of filasDeCuerpo.slice(0, 3)) expect(celdas(fila)).toEqual(['Sí', 'Sí']);
  });

  it('las dos de estadísticas salen de canViewStats: "Incluidas" sólo donde da true', () => {
    const esperadas = planSchema.options.map((plan) => (canViewStats(plan) ? 'Incluidas' : '—'));
    for (const fila of filasDeCuerpo.slice(3)) expect(celdas(fila)).toEqual(esperadas);
  });

  it('las filas dicen de qué son: registro, porcentajes, historial, y las dos de estadísticas', () => {
    const etiquetas = filasDeCuerpo.map((f) =>
      texto(/<th\b[^>]*scope="row"[^>]*>([\s\S]*?)<\/th>/.exec(f)?.[1] ?? ''),
    );
    expect(etiquetas).toEqual([
      'Registrar ejercicios y marcas sin límite',
      'Porcentajes de carga desde el RM',
      'Historial de marcas por ejercicio',
      'Progreso y estadísticas de cada ejercicio',
      'Estadísticas generales',
    ]);
  });
});

describe('el contenedor que desplaza la tabla (a 390 px mide 560 px)', () => {
  const contenedor = /<div\b([^>]*)>\s*<table\b/.exec(sec)?.[1] ?? '';

  it('se enfoca con el teclado: tabindex="0"', () => {
    expect(atributo(`<x${contenedor}>`, 'tabindex')).toBe('0');
  });

  it('es una región con nombre, el del caption de la tabla', () => {
    expect(atributo(`<x${contenedor}>`, 'role')).toBe('region');
    const id = atributo(`<x${contenedor}>`, 'aria-labelledby') ?? '';
    expect(id).not.toBe('');
    const apuntado = new RegExp(`<caption\\b[^>]*\\bid="${id}"`).test(tabla);
    expect(apuntado).toBe(true);
  });
});

describe('las tarjetas', () => {
  it('hay una por plan, Free primero', () => {
    const planes = [...sec.matchAll(/<article\b[^>]*data-plan="([^"]*)"/g)].map((m) => m[1]);
    expect(planes).toEqual(['free', 'pro']);
  });

  it('cada una se titula con su h3', () => {
    for (const [plan, nombre] of [
      ['free', 'Free'],
      ['pro', 'Pro'],
    ] as const) {
      expect(texto(/<h3\b[^>]*>([\s\S]*?)<\/h3>/.exec(tarjeta(plan))?.[1] ?? '')).toBe(nombre);
    }
  });

  it('la de Pro dice "Suscripción · precio por definir" y no dice período ni monto', () => {
    const t = texto(tarjeta('pro'));
    expect(t).toContain('Suscripción · precio por definir');
    expect(t).not.toMatch(/anual|mensual|\d|\$/i);
  });

  it('ni la sección entera habla de "anual" o "mensual"', () => {
    expect(texto(sec)).not.toMatch(/anual|mensual/i);
  });

  it('la de Free no nombra las estadísticas como algo que tiene', () => {
    expect(texto(tarjeta('free'))).not.toMatch(/estad[ií]stic/i);
  });

  it('la de Pro lleva el recorte de esquina y la de Free no', () => {
    expect(tarjeta('pro')).toContain('wc-plate-cut');
    expect(tarjeta('free')).not.toContain('wc-plate-cut');
  });
});

describe('las capturas', () => {
  it('son dos, con sus pies en orden: lo que ve Free y la suscripción', () => {
    expect(imagenes(sec)).toHaveLength(2);
    expect(pies.map((p) => p.split(' — ')[0])).toEqual(['ESTADÍSTICAS EN FREE', 'SUSCRIPCIÓN']);
  });

  it('traen sus dimensiones, son lazy (están bajo el pliegue) y tienen un alt que describe', () => {
    for (const img of imagenes(sec)) {
      expect(atributo(img, 'width'), img).toMatch(/^\d+$/);
      expect(atributo(img, 'height'), img).toMatch(/^\d+$/);
      expect(atributo(img, 'loading')).toBe('lazy');
      expect(atributo(img, 'alt')?.length).toBeGreaterThan(40);
    }
  });
});
