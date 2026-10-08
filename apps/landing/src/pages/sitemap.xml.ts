import type { APIRoute } from 'astro';
import { rutasIndexables } from '../content/sitio.ts';
import { configurarSeo, sitemapXml } from '../lib/seo.ts';

/*
 * El `sitemap.xml` (F10-04): las páginas que se indexan, con su URL absoluta. Fuera de producción
 * sale vacío: no hay URLs que dar (spec §5.7).
 */
export const GET: APIRoute = () => {
  const seo = configurarSeo(import.meta.env.PUBLIC_SITE_URL, import.meta.env.LANDING_INDEXABLE);
  return new Response(sitemapXml(seo, rutasIndexables), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
