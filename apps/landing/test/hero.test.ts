import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { disciplineSchema } from '@wasabi-cross/schemas';
import { describe, expect, inject, it } from 'vitest';
import { hero } from '../src/content/hero.ts';
import { titular } from '../src/content/sitio.ts';

/*
 * El hero (F10-05, spec §5.7) visto en el HTML que sale del build: el titular, el párrafo con las
 * disciplinas, la línea de ejercicios, los CTA según haya o no app a la que llevar, la franja de
 * métricas y la captura, que es la imagen del LCP.
 */

const sinApp = inject('salida');
const conApp = inject('salidaConApp');

const leer = (dir: string): string => readFileSync(join(dir, 'index.html'), 'utf8');
/** Lo que está dentro de <main>: el hero y, después, el resto de las secciones. */
const principal = (html: string): string => /<main\b[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] ?? '';
/** El texto de un fragmento de HTML, sin etiquetas y con los espacios normalizados. */
const texto = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const enlaces = (html: string): { href: string; clase: string; texto: string }[] =>
  [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
    href: /href="([^"]*)"/.exec(m[1] ?? '')?.[1] ?? '',
    clase: /class="([^"]*)"/.exec(m[1] ?? '')?.[1] ?? '',
    texto: texto(m[2] ?? ''),
  }));

describe('contenido del hero', () => {
  it('las disciplinas que nombra existen en el catálogo (disciplineSchema)', () => {
    for (const { id } of hero.disciplinas) {
      expect(disciplineSchema.options, `"${id}" no es una disciplina`).toContain(id);
    }
  });

  it('no repite una disciplina', () => {
    const ids = hero.disciplinas.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('texto del hero', () => {
  const html = principal(leer(sinApp));

  it('el h1 es el titular: primero la línea y después el acento', () => {
    const h1 = texto(/<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? '');
    expect(h1).toBe(`${titular.primeraLinea} ${titular.acento}`);
    expect(h1).toBe('Entrenás en varias disciplinas. Tus marcas, en un solo lugar.');
  });

  it('el párrafo nombra las disciplinas en voseo', () => {
    expect(texto(html)).toContain(
      'Registrá marcas de fuerza, repeticiones, distancia y tiempos de CrossFit, musculación, Hyrox, running y entrenamiento funcional.',
    );
  });

  it('la línea de ejercicios', () => {
    expect(texto(html)).toContain('Sentadilla · Burpees · Carrera · Ergómetro · Sled');
  });

  it('la franja dice qué se mide: KG, REPS y MM:SS', () => {
    const t = texto(html);
    for (const par of ['KG Fuerza', 'REPS Repeticiones', 'MM:SS Tiempo']) {
      expect(t, par).toContain(par);
    }
  });
});

describe('la captura del hero', () => {
  const html = principal(leer(sinApp));
  const figura = /<figure\b[^>]*\bid="demo"[^>]*>[\s\S]*?<\/figure>/.exec(html)?.[0] ?? '';

  it('es la figura #demo, a la que apuntan los enlaces "Ver la app en acción"', () => {
    expect(figura).not.toBe('');
    expect(figura).toContain('INICIO —');
  });

  it('es la imagen del LCP: eager y de prioridad alta, y la única que lo es', () => {
    const img = /<img\b[^>]*>/.exec(figura)?.[0] ?? '';
    expect(img).toContain('loading="eager"');
    expect(img).toContain('fetchpriority="high"');
    const eager = [...leer(sinApp).matchAll(/<img\b[^>]*loading="eager"[^>]*>/g)];
    expect(eager).toHaveLength(1);
  });

  it('describe lo que se ve y no repite el pie', () => {
    const alt = /\balt="([^"]+)"/.exec(figura)?.[1] ?? '';
    const pie = texto(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/.exec(figura)?.[1] ?? '');
    expect(alt.length).toBeGreaterThan(30);
    expect(pie).not.toContain(alt);
  });
});

describe('los CTA', () => {
  it('sin app: "Ver la app en acción" es el CTA lima y no hay "Empezar gratis"', () => {
    const html = leer(sinApp);
    const hero = enlaces(principal(html)).filter((e) => e.texto.includes('Ver la app en acción'));
    expect(hero).toHaveLength(1);
    expect(hero[0]?.href).toBe('#demo');
    expect(hero[0]?.clase).toMatch(/\bcta\b/);
    expect(html).not.toContain('Empezar gratis');
  });

  it('con app: "Empezar gratis" es el CTA y "Ver la app en acción" pasa a enlace de texto', () => {
    const html = principal(leer(conApp));
    const todos = enlaces(html);
    const empezar = todos.filter((e) => e.texto.includes('Empezar gratis'));
    const ver = todos.filter((e) => e.texto.includes('Ver la app en acción'));
    expect(empezar).toHaveLength(1);
    expect(empezar[0]?.href).toBe('https://app.ejemplo.test/login');
    expect(empezar[0]?.clase).toMatch(/\bcta\b/);
    expect(ver).toHaveLength(1);
    expect(ver[0]?.href).toBe('#demo');
    expect(ver[0]?.clase).toMatch(/\btexto\b/);
    expect(ver[0]?.clase).not.toMatch(/\bcta\b/);
  });

  it('en el footer pasa lo mismo, con la flecha hacia arriba', () => {
    const footer = /<footer\b[\s\S]*?<\/footer>/.exec(leer(conApp))?.[0] ?? '';
    const todos = enlaces(footer);
    expect(todos.some((e) => e.texto.includes('Empezar gratis') && e.texto.includes('↗'))).toBe(
      true,
    );
    expect(todos.some((e) => e.texto.includes('Ver la app en acción'))).toBe(true);
  });
});
