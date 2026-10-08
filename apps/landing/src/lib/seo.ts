/*
 * Indexación y URLs absolutas de la landing (spec §5.7 y §12). Dos variables de build:
 *
 *   - `PUBLIC_SITE_URL`: el origen público de la landing. Con él hay URLs absolutas (`og:url`,
 *     `og:image`, el sitemap). Sin él no se inventa ninguna.
 *   - `LANDING_INDEXABLE=1`: sólo producción. Sin eso —desarrollo, CI, staging— la página sale
 *     `noindex` y el `robots.txt` bloquea todo.
 */

/**
 * La configuración de SEO de un build. Si es indexable, el sitio existe: el tipo lo garantiza, así
 * que nada que arme una URL de producción tiene que preguntar por un `null`.
 */
export type Seo = { indexable: true; sitio: URL } | { indexable: false; sitio: URL | null };

/** El origen de una URL http(s) (el camino se descarta), o `null` si no hay valor. */
function origenDe(valor: string | undefined): URL | null {
  const texto = valor?.trim();
  if (texto === undefined || texto === '') return null;

  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    throw new Error(`PUBLIC_SITE_URL ("${texto}") no es una URL: tiene que ser http(s)://host`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`PUBLIC_SITE_URL tiene que ser http o https, no ${url.protocol}`);
  }
  return new URL(url.origin);
}

/**
 * Lee las dos variables. **Una combinación que no tiene sentido rompe el build** en vez de
 * degradarse en silencio: un deploy de producción sin sitio, o con un `LANDING_INDEXABLE` que no es
 * 1 ni 0, se tiene que notar antes de que la página salga mal indexada (o sin indexar).
 */
export function configurarSeo(
  publicSiteUrl: string | undefined,
  landingIndexable: string | undefined,
): Seo {
  const sitio = origenDe(publicSiteUrl);
  const bandera = landingIndexable?.trim() ?? '';
  if (bandera !== '' && bandera !== '0' && bandera !== '1') {
    throw new Error(`LANDING_INDEXABLE tiene que ser 1 o 0, no "${bandera}"`);
  }
  if (bandera !== '1') return { indexable: false, sitio };

  if (sitio === null) {
    throw new Error('LANDING_INDEXABLE=1 necesita PUBLIC_SITE_URL: sin el sitio no hay canonical');
  }
  if (sitio.protocol !== 'https:') {
    throw new Error('LANDING_INDEXABLE=1 exige que PUBLIC_SITE_URL sea https');
  }
  return { indexable: true, sitio };
}

function resolver(sitio: URL, ruta: string): string {
  if (!ruta.startsWith('/')) {
    throw new Error(`La ruta "${ruta}" tiene que empezar con una barra`);
  }
  return new URL(ruta, sitio).href;
}

/** La URL absoluta de una ruta del sitio, o `null` si el build no conoce el sitio. */
export function urlAbsoluta(seo: Seo, ruta: string): string | null {
  return seo.sitio === null ? null : resolver(seo.sitio, ruta);
}

/** El `<meta name="robots">` de una página: sólo se indexa si el sitio lo es y ella quiere. */
export function metaRobots(seo: Seo, indexar: boolean): 'index,follow' | 'noindex,nofollow' {
  return seo.indexable && indexar ? 'index,follow' : 'noindex,nofollow';
}

export function robotsTxt(seo: Seo): string {
  if (!seo.indexable) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\n\nSitemap: ${resolver(seo.sitio, '/sitemap.xml')}\n`;
}

function escaparXml(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/**
 * El sitemap con las páginas que se indexan. Fuera de producción es un sitemap vacío pero válido:
 * no hay URLs absolutas que dar, y nada que ofrecerle a un buscador.
 */
export function sitemapXml(seo: Seo, rutas: readonly string[]): string {
  const urls = seo.indexable
    ? rutas.map((r) => `  <url><loc>${escaparXml(resolver(seo.sitio, r))}</loc></url>\n`)
    : [];
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join('') +
    '</urlset>\n'
  );
}
