import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import { leerTokensHex } from '../src/lib/contraste.ts';

/*
 * El `<head>` que sale del build en cada ambiente (F10-04, spec §5.7): metadatos para compartir,
 * indexación sólo en producción, robots.txt y sitemap.xml, y nada de PWA.
 */

const dev = inject('salida');
const staging = inject('salidaConApp');
const produccion = inject('salidaProduccion');
const site = inject('siteUrl');

const leer = (dir: string, archivo: string): string => readFileSync(join(dir, archivo), 'utf8');
/** El `content` de un `<meta name|property="…">`, o undefined si no está. */
function meta(html: string, clave: string): string | undefined {
  const etiqueta = [...html.matchAll(/<meta\b[^>]*>/g)]
    .map((m) => m[0])
    .find((e) => new RegExp(`(?:name|property)="${clave}"`).test(e));
  return etiqueta === undefined ? undefined : /content="([^"]*)"/.exec(etiqueta)?.[1];
}
const canonical = (html: string): string | undefined =>
  /<link\b[^>]*rel="canonical"[^>]*href="([^"]*)"/.exec(html)?.[1];

describe('metadatos comunes, en todos los ambientes', () => {
  for (const [nombre, dir] of [
    ['desarrollo y CI', dev],
    ['staging', staging],
    ['producción', produccion],
  ] as const) {
    describe(nombre, () => {
      const html = leer(dir, 'index.html');

      it('tiene título y descripción', () => {
        expect(/<title>([^<]+)<\/title>/.exec(html)?.[1]).toMatch(/Wasabi Cross/);
        expect(meta(html, 'description')?.length).toBeGreaterThan(40);
      });

      it('repite título y descripción para compartir (Open Graph y Twitter)', () => {
        expect(meta(html, 'og:title')).toBe(/<title>([^<]+)<\/title>/.exec(html)?.[1]);
        expect(meta(html, 'og:description')).toBe(meta(html, 'description'));
        expect(meta(html, 'og:type')).toBe('website');
        expect(meta(html, 'og:locale')).toBe('es_AR');
        expect(meta(html, 'og:site_name')).toBe('Wasabi Cross');
        expect(meta(html, 'twitter:card')).toBe('summary_large_image');
      });

      it('el color del tema es el fondo de la marca', () => {
        const ui = resolve(
          import.meta.dirname,
          '..',
          '..',
          '..',
          'packages',
          'ui',
          'src',
          'styles',
        );
        const fondo = leerTokensHex(readFileSync(join(ui, 'tokens.css'), 'utf8')).get('wc-bg');
        expect(meta(html, 'theme-color')?.toLowerCase()).toBe(fondo);
      });

      it('trae los íconos: favicon.ico, el SVG y el de iOS', () => {
        expect(html).toMatch(/<link\b[^>]*rel="icon"[^>]*href="\/favicon\.ico"[^>]*sizes="32x32"/);
        expect(html).toMatch(/<link\b[^>]*rel="icon"[^>]*href="\/logo\.svg"/);
        expect(html).toMatch(
          /<link\b[^>]*rel="apple-touch-icon"[^>]*href="\/apple-touch-icon\.png"/,
        );
        for (const archivo of ['favicon.ico', 'logo.svg', 'apple-touch-icon.png', 'og.png']) {
          expect(existsSync(join(dir, archivo)), archivo).toBe(true);
        }
      });

      it('no es una PWA: ni manifest ni service worker', () => {
        expect(html).not.toMatch(/rel="manifest"/);
        const archivos = readdirSync(dir, { recursive: true }).map(String);
        expect(archivos.filter((a) => /manifest|(?:^|[\\/])sw\.js$|workbox/i.test(a))).toEqual([]);
      });

      it('no lleva JSON-LD', () => {
        expect(html).not.toContain('application/ld+json');
      });
    });
  }
});

describe('desarrollo y CI: sin variables', () => {
  const html = leer(dev, 'index.html');

  it('no se indexa y no inventa ninguna URL absoluta', () => {
    expect(meta(html, 'robots')).toBe('noindex,nofollow');
    expect(canonical(html)).toBeUndefined();
    expect(meta(html, 'og:url')).toBeUndefined();
    expect(meta(html, 'og:image')).toBeUndefined();
    expect(meta(html, 'twitter:image')).toBeUndefined();
  });

  it('robots.txt bloquea todo y no menciona un sitemap', () => {
    expect(leer(dev, 'robots.txt')).toBe('User-agent: *\nDisallow: /\n');
  });

  it('el sitemap está vacío', () => {
    expect(leer(dev, 'sitemap.xml')).not.toContain('<url>');
  });
});

describe('staging: con el sitio, sin LANDING_INDEXABLE', () => {
  const html = leer(staging, 'index.html');

  it('no se indexa y no tiene canonical', () => {
    expect(meta(html, 'robots')).toBe('noindex,nofollow');
    expect(canonical(html)).toBeUndefined();
  });

  it('pero comparte bien: og:url y la imagen son absolutas, para que el enlace tenga vista previa', () => {
    expect(meta(html, 'og:url')).toBe(`${site}/`);
    expect(meta(html, 'og:image:alt')?.length).toBeGreaterThan(10);
    expect(meta(html, 'og:image:width')).toBe('1200');
    expect(meta(html, 'og:image:height')).toBe('630');
    expect(meta(html, 'og:image')).toBe(`${site}/og.png`);
    expect(meta(html, 'twitter:image')).toBe(`${site}/og.png`);
  });

  it('robots.txt bloquea todo y el sitemap está vacío', () => {
    expect(leer(staging, 'robots.txt')).toBe('User-agent: *\nDisallow: /\n');
    expect(leer(staging, 'sitemap.xml')).not.toContain('<url>');
  });
});

describe('producción: con el sitio y LANDING_INDEXABLE=1', () => {
  const html = leer(produccion, 'index.html');

  it('se indexa, con su canonical', () => {
    expect(meta(html, 'robots')).toBe('index,follow');
    expect(canonical(html)).toBe(`${site}/`);
  });

  it('og:url, og:image y twitter:image son absolutas', () => {
    expect(meta(html, 'og:url')).toBe(`${site}/`);
    expect(meta(html, 'og:image')).toBe(`${site}/og.png`);
    expect(meta(html, 'twitter:image')).toBe(`${site}/og.png`);
  });

  it('robots.txt permite todo y apunta al sitemap', () => {
    expect(leer(produccion, 'robots.txt')).toBe(
      `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`,
    );
  });

  it('el sitemap lista la home', () => {
    expect(leer(produccion, 'sitemap.xml')).toContain(`<loc>${site}/</loc>`);
  });

  it('el sitemap sólo lista páginas que existen y que se indexan (nunca la 404)', () => {
    const rutas = [...leer(produccion, 'sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (m) => new URL(m[1] ?? '').pathname,
    );
    expect(rutas.length).toBeGreaterThan(0);
    for (const ruta of rutas) {
      const candidatos =
        ruta === '/' ? ['index.html'] : [`${ruta.slice(1)}.html`, `${ruta.slice(1)}/index.html`];
      const archivo = candidatos.find((c) => existsSync(join(produccion, c)));
      expect(archivo, `${ruta} está en el sitemap pero no existe como página`).toBeDefined();
      expect(meta(leer(produccion, archivo ?? ''), 'robots'), ruta).toBe('index,follow');
    }
  });

  it('la 404 no se indexa nunca, ni siquiera en producción, y no tiene canonical', () => {
    const html404 = leer(produccion, '404.html');
    expect(meta(html404, 'robots')).toBe('noindex,nofollow');
    expect(canonical(html404)).toBeUndefined();
  });
});
