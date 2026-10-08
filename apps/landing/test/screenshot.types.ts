import type { ImageMetadata } from 'astro';
import type { ScreenshotProps } from '../src/lib/screenshot.ts';

/*
 * Pruebas de tipos, no de ejecución: `astro check` (`pnpm typecheck`) las corre. Un
 * `@ts-expect-error` que deja de fallar es un error de TypeScript: si alguien vuelve opcional el
 * `alt`, el typecheck rompe (F10-03: "dado un `Screenshot` sin `alt`, el typecheck falla").
 */

declare const src: ImageMetadata;

export const completa: ScreenshotProps = {
  src,
  alt: 'Detalle de un ejercicio',
  pie: 'DETALLE',
  sizes: '100vw',
};

// @ts-expect-error — el alt es obligatorio
export const sinAlt: ScreenshotProps = { src, pie: 'DETALLE', sizes: '100vw' };

// @ts-expect-error — y el pie
export const sinPie: ScreenshotProps = { src, alt: 'Detalle', sizes: '100vw' };

// @ts-expect-error — y `sizes`: sin él el navegador baja siempre la imagen más grande
export const sinSizes: ScreenshotProps = { src, alt: 'Detalle', pie: 'DETALLE' };
