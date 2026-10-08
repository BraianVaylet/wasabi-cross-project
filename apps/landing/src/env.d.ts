/*
 * Las variables de build de la landing. `PUBLIC_*` las inlinea Astro al compilar (no hay JavaScript
 * de cliente que las lea después) y son públicas: nunca llevan un secreto (spec §13).
 */
interface ImportMetaEnv {
  /** El origen de la app, para "Entrar" y "Empezar gratis" (spec §5.7). Sin ella, no se muestran. */
  readonly PUBLIC_APP_URL?: string;
  /** El origen público de la landing, para las URLs absolutas (`og:image`, canonical, sitemap). */
  readonly PUBLIC_SITE_URL?: string;
  /** `1` sólo en producción: sin eso la landing sale `noindex` (spec §5.7). No es `PUBLIC_`: sólo se lee al compilar. */
  readonly LANDING_INDEXABLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/*
 * Un `.astro` importado desde un `.ts` (los tests de los componentes). `astro check` lo resuelve
 * solo; typescript-eslint no entiende `.astro` y lo tiparía como error.
 */
declare module '*.astro' {
  import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
  const Component: AstroComponentFactory;
  export default Component;
}
