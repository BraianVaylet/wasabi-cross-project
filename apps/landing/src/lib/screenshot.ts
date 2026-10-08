import type { ImageMetadata } from 'astro';

/**
 * Las props de `<Screenshot>`. Viven acá y no en el `.astro` para que una prueba de tipos
 * (test/screenshot.types.ts) pueda comprobar que lo obligatorio lo sigue siendo.
 */
export interface ScreenshotProps {
  /** La captura, importada de `src/assets/capturas/`. */
  src: ImageMetadata;
  /**
   * Lo que se ve en la captura, para quien no la ve. Obligatorio y no vacío: una captura es una
   * imagen informativa, nunca decorativa. No es una copia del pie.
   */
  alt: string;
  /** El pie visible: "TÍTULO — qué muestra". */
  pie: string;
  /**
   * Cuánto ocupa la imagen en pantalla (atributo `sizes`). Obligatorio: sin él el navegador baja
   * siempre la versión más grande.
   */
  sizes: string;
  /** La imagen del LCP (la del hero): se pide enseguida y con prioridad alta. Por defecto es lazy. */
  prioridad?: boolean;
}
