import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * La imagen para compartir y los íconos (F10-04). Son binarios que viven en `public/`, así que se
 * comprueba lo que importa de ellos: el tamaño de la imagen, y que los íconos sean los de la app.
 */

const PUBLIC = resolve(import.meta.dirname, '..', 'public');
const WEB = resolve(import.meta.dirname, '..', '..', 'web', 'public');

/** Ancho y alto de un PNG, de su cabecera (IHDR): bytes 16-23. */
function dimensionesPng(archivo: string): { ancho: number; alto: number } {
  const bytes = readFileSync(archivo);
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return { ancho: bytes.readUInt32BE(16), alto: bytes.readUInt32BE(20) };
}

describe('og.png', () => {
  it('mide 1200×630, lo que piden WhatsApp, Facebook y X para la tarjeta grande', () => {
    expect(dimensionesPng(join(PUBLIC, 'og.png'))).toEqual({ ancho: 1200, alto: 630 });
  });

  it('pesa menos de 300 KB: algunas apps descartan las imágenes pesadas', () => {
    expect(readFileSync(join(PUBLIC, 'og.png')).byteLength).toBeLessThan(300 * 1024);
  });
});

describe('íconos', () => {
  for (const archivo of ['favicon.ico', 'logo.svg', 'apple-touch-icon.png']) {
    it(`${archivo} es el mismo que el de la app`, () => {
      expect(readFileSync(join(PUBLIC, archivo)).equals(readFileSync(join(WEB, archivo)))).toBe(
        true,
      );
    });
  }
});
