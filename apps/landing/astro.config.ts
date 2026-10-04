import { defineConfig } from 'astro/config';

/*
 * La landing es un sitio estático (spec §5.7, ADR-0013): se compila a HTML y CSS, sin JavaScript
 * de cliente. Lo sirve un servidor propio (F10-11), no la API.
 */
export default defineConfig({
  output: 'static',
  build: {
    // Todo el CSS en archivos, nunca dentro del HTML: es lo que deja servir la página con una CSP
    // sin `unsafe-inline` en los estilos (spec §13, F10-11). Por defecto Astro inlinea los chicos.
    inlineStylesheets: 'never',
  },
  server: { port: 4321 },
});
