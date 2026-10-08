import type { APIRoute } from 'astro';
import { configurarSeo, robotsTxt } from '../lib/seo.ts';

/*
 * El `robots.txt` (F10-04): en producción permite todo y apunta al sitemap; en cualquier otro
 * ambiente bloquea todo (spec §5.7).
 */
export const GET: APIRoute = () => {
  const seo = configurarSeo(import.meta.env.PUBLIC_SITE_URL, import.meta.env.LANDING_INDEXABLE);
  return new Response(robotsTxt(seo), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
