import { describe, expect, it } from 'vitest';
import { configurarSeo, metaRobots, robotsTxt, sitemapXml, urlAbsoluta } from '../src/lib/seo.ts';

/*
 * Indexación y URLs absolutas (F10-04, spec §5.7 y §12). La landing sólo es indexable en
 * producción: el build trae `PUBLIC_SITE_URL` y `LANDING_INDEXABLE=1`. Sin eso —desarrollo, CI,
 * staging— sale `noindex`, y sin `PUBLIC_SITE_URL` no se inventa ninguna URL absoluta.
 */

const SITIO = 'https://wasabicross.ejemplo.test';

describe('configurarSeo()', () => {
  it('sin variables (desarrollo, CI): ni indexable ni sitio', () => {
    expect(configurarSeo(undefined, undefined)).toEqual({ indexable: false, sitio: null });
    expect(configurarSeo('', '')).toEqual({ indexable: false, sitio: null });
    expect(configurarSeo('   ', '  ')).toEqual({ indexable: false, sitio: null });
  });

  it('staging: conoce el sitio (para las URLs absolutas) pero no es indexable', () => {
    const seo = configurarSeo(SITIO, undefined);
    expect(seo.indexable).toBe(false);
    expect(seo.sitio?.href).toBe(`${SITIO}/`);
    expect(configurarSeo(SITIO, '0').indexable).toBe(false);
  });

  it('producción: sitio https y LANDING_INDEXABLE=1', () => {
    const seo = configurarSeo(SITIO, '1');
    expect(seo.indexable).toBe(true);
    expect(seo.sitio?.origin).toBe(SITIO);
  });

  it('se queda con el origen: un camino en la variable se descarta', () => {
    expect(configurarSeo(`${SITIO}/algo/mas?x=1`, '1').sitio?.href).toBe(`${SITIO}/`);
  });

  it('LANDING_INDEXABLE=1 sin sitio es un deploy mal hecho: rompe el build', () => {
    expect(() => configurarSeo(undefined, '1')).toThrow(/PUBLIC_SITE_URL/);
  });

  it('LANDING_INDEXABLE=1 exige https', () => {
    expect(() => configurarSeo('http://wasabicross.ejemplo.test', '1')).toThrow(/https/);
  });

  it('LANDING_INDEXABLE sólo vale 1 o 0: "true" no se interpreta', () => {
    expect(() => configurarSeo(SITIO, 'true')).toThrow(/LANDING_INDEXABLE/);
    expect(() => configurarSeo(SITIO, 'si')).toThrow(/LANDING_INDEXABLE/);
  });

  it('PUBLIC_SITE_URL tiene que ser una URL http(s)', () => {
    expect(() => configurarSeo('wasabicross.ejemplo.test', undefined)).toThrow(/PUBLIC_SITE_URL/);
    expect(() => configurarSeo('javascript:alert(1)', undefined)).toThrow(/http/);
  });
});

describe('urlAbsoluta()', () => {
  it('arma la URL sobre el sitio', () => {
    const seo = configurarSeo(SITIO, undefined);
    expect(urlAbsoluta(seo, '/')).toBe(`${SITIO}/`);
    expect(urlAbsoluta(seo, '/og.png')).toBe(`${SITIO}/og.png`);
  });

  it('sin sitio no inventa nada', () => {
    expect(urlAbsoluta(configurarSeo(undefined, undefined), '/og.png')).toBeNull();
  });

  it('la ruta empieza con barra', () => {
    expect(() => urlAbsoluta(configurarSeo(SITIO, undefined), 'og.png')).toThrow(/barra/);
  });
});

describe('metaRobots()', () => {
  it('index,follow sólo si el sitio es indexable y la página quiere indexarse', () => {
    const prod = configurarSeo(SITIO, '1');
    expect(metaRobots(prod, true)).toBe('index,follow');
    expect(metaRobots(prod, false)).toBe('noindex,nofollow');
  });

  it('fuera de producción siempre noindex, aunque la página quiera indexarse', () => {
    expect(metaRobots(configurarSeo(SITIO, undefined), true)).toBe('noindex,nofollow');
    expect(metaRobots(configurarSeo(undefined, undefined), true)).toBe('noindex,nofollow');
  });
});

describe('robotsTxt()', () => {
  it('fuera de producción bloquea todo y no apunta a ningún sitemap', () => {
    for (const seo of [configurarSeo(undefined, undefined), configurarSeo(SITIO, undefined)]) {
      expect(robotsTxt(seo)).toBe('User-agent: *\nDisallow: /\n');
    }
  });

  it('en producción permite todo y apunta al sitemap', () => {
    expect(robotsTxt(configurarSeo(SITIO, '1'))).toBe(
      `User-agent: *\nAllow: /\n\nSitemap: ${SITIO}/sitemap.xml\n`,
    );
  });
});

describe('sitemapXml()', () => {
  it('en producción lista las páginas con su URL absoluta', () => {
    const xml = sitemapXml(configurarSeo(SITIO, '1'), ['/', '/privacidad']);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`<loc>${SITIO}/</loc>`);
    expect(xml).toContain(`<loc>${SITIO}/privacidad</loc>`);
  });

  it('fuera de producción es un sitemap vacío pero válido', () => {
    for (const seo of [configurarSeo(undefined, undefined), configurarSeo(SITIO, undefined)]) {
      const xml = sitemapXml(seo, ['/']);
      expect(xml).toContain('<urlset');
      expect(xml).not.toContain('<url>');
    }
  });

  it('escapa lo que XML no admite en una URL', () => {
    const xml = sitemapXml(configurarSeo(SITIO, '1'), ['/a?x=1&y=2']);
    expect(xml).toContain(`<loc>${SITIO}/a?x=1&amp;y=2</loc>`);
  });
});
