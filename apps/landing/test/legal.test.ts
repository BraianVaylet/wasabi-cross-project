import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, inject, it } from 'vitest';
import { atributo, leer, principal, texto } from './html.ts';

/*
 * Las páginas legales (F10-09, spec §5.7 y §13) vistas en el HTML que sale del build: que existan
 * en los tres ambientes, que estén enlazadas desde el footer, que entren al sitemap de producción
 * y no al de staging, y que digan quién responde (o avisen que falta) y no se publiquen sin eso.
 */

const sinVariables = inject('salida');
const staging = inject('salidaConApp');
const produccion = inject('salidaProduccion');
const siteUrl = inject('siteUrl');
const NOMBRE = inject('contactoNombre');
const EMAIL = inject('contactoEmail');

const PAGINAS = [
  { ruta: '/privacidad/', carpeta: 'privacidad', h1: 'Política de privacidad' },
  { ruta: '/terminos/', carpeta: 'terminos', h1: 'Términos y condiciones' },
] as const;

const pagina = (dir: string, carpeta: string): string => leer(dir, join(carpeta, 'index.html'));
const hrefs = (html: string): string[] =>
  [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => m[1] ?? '');
const navLegal = (html: string): string =>
  /<footer\b[\s\S]*?<nav\b[^>]*aria-label="Legal"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? '';

describe('las dos páginas existen en todos los ambientes', () => {
  for (const { ruta, carpeta } of PAGINAS) {
    for (const [nombre, dir] of [
      ['sin variables', sinVariables],
      ['staging', staging],
      ['producción', produccion],
    ] as const) {
      it(`${ruta} · ${nombre}`, () => {
        expect(existsSync(join(dir, carpeta, 'index.html'))).toBe(true);
      });
    }
  }
});

describe('estructura de cada página', () => {
  for (const { ruta, carpeta, h1 } of PAGINAS) {
    const html = pagina(produccion, carpeta);
    const main = principal(html);

    it(`${ruta}: un solo h1, el título del documento, y después sólo h2`, () => {
      expect([...html.matchAll(/<h1\b/g)]).toHaveLength(1);
      expect(texto(/<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(main)?.[1] ?? '')).toBe(h1);
      expect(main).not.toMatch(/<h[3-6]\b/);
      expect([...main.matchAll(/<h2\b/g)].length).toBeGreaterThanOrEqual(5);
    });

    it(`${ruta}: cada sección es una región con nombre, el de su h2`, () => {
      const secciones = [...main.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/g)];
      expect(secciones.length).toBeGreaterThanOrEqual(5);
      for (const m of secciones) {
        const id = atributo(`<x${m[1] ?? ''}>`, 'aria-labelledby') ?? '';
        expect(id).not.toBe('');
        expect(m[2]).toContain(`id="${id}"`);
      }
    });

    it(`${ruta}: dice la fecha de la última actualización`, () => {
      expect(texto(main)).toMatch(/Última actualización: \d{1,2} de [a-z]+ de \d{4}/);
    });

    it(`${ruta}: la nav de anclas y "Ver la app en acción" no están, porque no hay a dónde ir`, () => {
      expect(html).not.toMatch(/aria-label="Secciones"/);
      expect(html).not.toContain('href="#demo"');
      expect(html).not.toContain('href="#registro"');
    });

    it(`${ruta}: no pide nada a otro host ni lleva JavaScript`, () => {
      expect(html).not.toMatch(/<script\b/);
      // Sólo el origen de la app (el CTA) y el del propio sitio (el canonical).
      expect(html).not.toMatch(
        /(?:src|href)="https?:\/\/(?!app\.ejemplo\.test|wasabicross\.ejemplo\.test)/,
      );
    });
  }
});

describe('indexación', () => {
  for (const { ruta, carpeta } of PAGINAS) {
    it(`${ruta}: en producción se indexa y tiene su canonical`, () => {
      const html = pagina(produccion, carpeta);
      expect(html).toContain('<meta name="robots" content="index,follow"');
      expect(html).toContain(`<link rel="canonical" href="${siteUrl}${ruta}"`);
    });

    it(`${ruta}: en staging y sin variables, noindex`, () => {
      for (const dir of [staging, sinVariables]) {
        expect(pagina(dir, carpeta)).toContain('<meta name="robots" content="noindex,nofollow"');
      }
    });
  }

  it('el sitemap de producción lista la home y las dos páginas', () => {
    const xml = leer(produccion, 'sitemap.xml');
    const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual([`${siteUrl}/`, `${siteUrl}/privacidad/`, `${siteUrl}/terminos/`]);
  });

  it('el de staging y el de sin variables salen vacíos', () => {
    for (const dir of [staging, sinVariables]) {
      expect(leer(dir, 'sitemap.xml')).not.toContain('<loc>');
    }
  });
});

describe('el footer las enlaza', () => {
  const paginas: [string, string][] = [
    ['home', leer(produccion)],
    ['404', leer(produccion, '404.html')],
    ['privacidad', pagina(produccion, 'privacidad')],
    ['términos', pagina(produccion, 'terminos')],
  ];

  for (const [nombre, html] of paginas) {
    it(`${nombre}: una nav "Legal" con Privacidad y Términos, en ese orden`, () => {
      const nav = navLegal(html);
      expect(hrefs(nav)).toEqual(['/privacidad/', '/terminos/']);
      expect(texto(nav)).toBe('Privacidad Términos');
    });
  }

  it('la home trae los dos enlaces una sola vez cada uno', () => {
    const todos = hrefs(leer(produccion));
    expect(todos.filter((h) => h === '/privacidad/')).toHaveLength(1);
    expect(todos.filter((h) => h === '/terminos/')).toHaveLength(1);
  });
});

describe('quién responde', () => {
  for (const { ruta, carpeta } of PAGINAS) {
    it(`${ruta}: en staging y producción dice el nombre y el email, con un enlace mailto`, () => {
      for (const dir of [staging, produccion]) {
        const main = principal(pagina(dir, carpeta));
        expect(texto(main)).toContain(NOMBRE);
        expect(texto(main)).toContain(EMAIL);
        expect(main).toContain(`href="mailto:${EMAIL}"`);
        expect(texto(main)).not.toMatch(/antes de publicar el sitio/);
      }
    });

    it(`${ruta}: sin variables avisa que el contacto falta y no trae ningún email`, () => {
      const main = principal(pagina(sinVariables, carpeta));
      expect(texto(main)).toMatch(/antes de publicar el sitio/);
      expect(main).not.toContain('mailto:');
      expect(texto(main)).not.toContain(NOMBRE);
    });
  }
});

describe('un build de producción sin responsable no sale', () => {
  const ROOT = fileURLToPath(new URL('..', import.meta.url));
  const ASTRO = join(ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs');
  const run = promisify(execFile);

  it('LANDING_INDEXABLE=1 sin PUBLIC_CONTACT_NAME ni PUBLIC_CONTACT_EMAIL rompe el build', async () => {
    const salida = await mkdtemp(join(tmpdir(), 'wasabi-landing-legal-'));
    try {
      // Astro cuenta el error por stdout o por stderr según la versión: se mira todo lo que escribió.
      const fallo = await run(
        process.execPath,
        [ASTRO, 'build', '--root', ROOT, '--outDir', salida],
        {
          cwd: ROOT,
          env: {
            ...process.env,
            PUBLIC_APP_URL: '',
            PUBLIC_SITE_URL: siteUrl,
            PUBLIC_CONTACT_NAME: '',
            PUBLIC_CONTACT_EMAIL: '',
            LANDING_INDEXABLE: '1',
          },
        },
      ).then(
        () => null,
        (e: unknown) => {
          const { stdout = '', stderr = '' } = e as { stdout?: string; stderr?: string };
          return `${stdout}\n${stderr}`;
        },
      );
      expect(fallo, 'el build tenía que romperse').not.toBeNull();
      expect(fallo).toMatch(/PUBLIC_CONTACT_NAME y PUBLIC_CONTACT_EMAIL/);
    } finally {
      await rm(salida, { recursive: true, force: true });
    }
  }, 120_000);
});
