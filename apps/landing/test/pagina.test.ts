import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, inject, it } from 'vitest';

/*
 * La estructura de la página (F10-03, spec §5.7 y §11) vista en el HTML que sale del build: los
 * landmarks, el enlace para saltar al contenido, "Entrar" y "Empezar gratis" según haya o no app a
 * la que llevar, la 404 y las imágenes.
 */

const sinApp = inject('salida');
const conApp = inject('salidaConApp');
const appUrl = inject('appUrl');

const leer = (dir: string, archivo: string): string => readFileSync(join(dir, archivo), 'utf8');
const hrefs = (html: string): string[] =>
  [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => m[1] ?? '');

describe('estructura', () => {
  const html = leer(sinApp, 'index.html');

  it('tiene header, main (destino del enlace de salto) y footer, una sola vez cada uno', () => {
    expect(html.match(/<header\b/g)).toHaveLength(1);
    expect(html.match(/<main\b[^>]*\bid="contenido"/g)).toHaveLength(1);
    expect(html.match(/<footer\b/g)).toHaveLength(1);
  });

  it('tiene un solo h1', () => {
    expect(html.match(/<h1\b/g)).toHaveLength(1);
  });

  it('el primer enlace de la página es "Saltar al contenido", y va a #contenido', () => {
    const primero = /<body[\s\S]*?(<a\b[^>]*>[\s\S]*?<\/a>)/.exec(html)?.[1] ?? '';
    expect(primero).toContain('href="#contenido"');
    expect(primero).toContain('Saltar al contenido');
  });

  it('el logo enlaza al inicio y se lee "Wasabi Cross"', () => {
    const logo = /<a\b[^>]*aria-label="Wasabi Cross, inicio"[^>]*>/.exec(html)?.[0] ?? '';
    expect(logo).toContain('href="/"');
  });

  it('la nav de anclas trae Registro, Funciones y Free / PRO', () => {
    const nav = /<nav\b[^>]*aria-label="Secciones"[^>]*>([\s\S]*?)<\/nav>/.exec(html)?.[1] ?? '';
    expect(hrefs(nav)).toEqual(['#registro', '#funciones', '#planes']);
    expect(nav).toContain('Registro');
    expect(nav).toContain('Funciones');
    expect(nav).toContain('Free / PRO');
  });
});

describe('"Entrar" y "Empezar gratis" (decisión 2 de la Fase 10)', () => {
  it('sin PUBLIC_APP_URL no aparece ninguno de los dos, ni un enlace a /login', () => {
    const html = leer(sinApp, 'index.html');
    expect(html).not.toMatch(/Entrar/);
    expect(html).not.toMatch(/Empezar gratis/);
    expect(hrefs(html).filter((h) => h.includes('/login'))).toEqual([]);
  });

  it('con PUBLIC_APP_URL, los dos apuntan al /login de la app y a ninguna otra parte de ella', () => {
    const html = leer(conApp, 'index.html');
    expect(html).toMatch(/Entrar/);
    expect(html).toMatch(/Empezar gratis/);
    const haciaLaApp = hrefs(html).filter((h) => h.startsWith(appUrl));
    expect(haciaLaApp.length).toBeGreaterThanOrEqual(2);
    expect(new Set(haciaLaApp)).toEqual(new Set([`${appUrl}/login`]));
  });

  it('el texto "Entrar" es el de un enlace, no el de un botón sin destino', () => {
    const html = leer(conApp, 'index.html');
    const enlaces = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map((m) => m[0]);
    const entrar = enlaces.find((e) => e.includes('Entrar')) ?? '';
    expect(entrar).toContain(`href="${appUrl}/login"`);
  });
});

describe('404', () => {
  for (const [nombre, dir] of [
    ['sin app', sinApp],
    ['con app', conApp],
  ] as const) {
    it(`genera 404.html con la marca y un enlace al inicio (${nombre})`, () => {
      expect(existsSync(join(dir, '404.html'))).toBe(true);
      const html = leer(dir, '404.html');
      expect(html).toMatch(/<html[^>]*\blang="es-AR"/);
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(hrefs(html)).toContain('/');
    });
  }

  it('no deja anclas colgando: sin la nav de secciones ni "Ver la app en acción" (#demo)', () => {
    const html = leer(sinApp, '404.html');
    expect(html).not.toMatch(/aria-label="Secciones"/);
    // Lo único que se permite es el enlace de salto, que apunta al <main> de la propia 404.
    expect(hrefs(html).filter((h) => h.startsWith('#') && h !== '#contenido')).toEqual([]);
  });
});

describe('imágenes', () => {
  const html = leer(sinApp, 'index.html');
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);

  it('hay al menos una captura en la página de ejemplo', () => {
    expect(imgs.length).toBeGreaterThan(0);
  });

  it('todas traen alt, width y height: sin alt no hay imagen informativa, y sin tamaño hay saltos de layout', () => {
    for (const img of imgs) {
      expect(img).toMatch(/\balt="[^"]+"/);
      expect(img).toMatch(/\bwidth="\d+"/);
      expect(img).toMatch(/\bheight="\d+"/);
    }
  });

  it('lo que se sirve es un formato moderno y pesa menos que el PNG de origen', () => {
    const origen = statSync(
      resolve(import.meta.dirname, '..', 'src', 'assets', 'capturas', '01-home.png'),
    ).size;
    const archivos = imgs.flatMap((img) =>
      [...img.matchAll(/(?:src|srcset)="([^"]+)"/g)].flatMap((m) =>
        (m[1] ?? '').split(',').map((c) => c.trim().split(/\s+/)[0] ?? ''),
      ),
    );
    expect(archivos.length).toBeGreaterThan(0);
    for (const archivo of archivos) {
      expect(archivo).toMatch(/\.(?:webp|avif)$/);
      const tamano = statSync(join(sinApp, ...archivo.split('/').filter(Boolean))).size;
      expect(tamano).toBeLessThan(origen);
    }
  });
});
