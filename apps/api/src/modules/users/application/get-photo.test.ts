import { describe, expect, it, vi } from 'vitest';
import { PHOTO_MAX_BYTES } from '../domain/photo.ts';
import { getPhoto, type PhotoDownloader } from './get-photo.ts';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const GOOGLE = 'https://lh3.googleusercontent.com/a/ACg8oc=s96-c';

/** El descargador, en un doble: lo que `fetch` haría contra Google, sin red. */
function downloader(result: Awaited<ReturnType<PhotoDownloader>> = { bytes: new Uint8Array(PNG) }) {
  return vi.fn<PhotoDownloader>(() => Promise.resolve(result));
}

describe('getPhoto', () => {
  describe('con una foto de Microsoft (data URL)', () => {
    it('la decodifica y la sirve, con el tipo que dicen los bytes, sin bajar nada', async () => {
      const download = downloader();

      const result = await getPhoto(
        { download },
        `data:image/jpeg;base64, ${JPEG.toString('base64')}`,
      );

      expect(result).toEqual({
        found: true,
        photo: { type: 'image/jpeg', bytes: new Uint8Array(JPEG) },
      });
      expect(download).not.toHaveBeenCalled();
    });

    it('el tipo es el de los bytes, no el que declaró el data URL', async () => {
      const result = await getPhoto(
        { download: downloader() },
        `data:image/jpeg;base64,${PNG.toString('base64')}`,
      );

      expect(result).toMatchObject({ found: true, photo: { type: 'image/png' } });
    });

    it('un tipo declarado que no se sirve (SVG) es "tipo_no_permitido", y no se baja nada', async () => {
      const download = downloader();

      const result = await getPhoto(
        { download },
        `data:image/svg+xml;base64,${Buffer.from('<svg/>').toString('base64')}`,
      );

      expect(result).toEqual({ found: false, reason: 'tipo_no_permitido' });
      expect(download).not.toHaveBeenCalled();
    });

    it('un tipo permitido con bytes que no son una imagen es "no_es_una_imagen"', async () => {
      const result = await getPhoto(
        { download: downloader() },
        `data:image/png;base64,${Buffer.from('<script>alert(1)</script>').toString('base64')}`,
      );

      expect(result).toEqual({ found: false, reason: 'no_es_una_imagen' });
    });
  });

  describe('con una foto de Google (URL)', () => {
    it('la baja del host de Google y la sirve', async () => {
      const download = downloader({ bytes: new Uint8Array(PNG) });

      const result = await getPhoto({ download }, GOOGLE);

      expect(download).toHaveBeenCalledExactlyOnceWith(new URL(GOOGLE));
      expect(result).toEqual({
        found: true,
        photo: { type: 'image/png', bytes: new Uint8Array(PNG) },
      });
    });

    it.each([
      'https://example.com/foto.png',
      'http://lh3.googleusercontent.com/a',
      'https://169.254.169.254/latest/meta-data',
      'https://lh3.googleusercontent.com.evil.example/a',
      'file:///etc/passwd',
    ])('otro origen (%s): no se baja nunca y es "origen_no_permitido"', async (image) => {
      const download = downloader();

      const result = await getPhoto({ download }, image);

      expect(result).toEqual({ found: false, reason: 'origen_no_permitido' });
      expect(download).not.toHaveBeenCalled();
    });

    it.each(['muy_grande', 'proveedor_no_responde'] as const)(
      'si la descarga falla (%s), es sin foto con ese motivo',
      async (failure) => {
        const result = await getPhoto({ download: downloader({ failure }) }, GOOGLE);

        expect(result).toEqual({ found: false, reason: failure });
      },
    );

    it('si lo que bajó no es una imagen (HTML, un SVG), no se sirve aunque el host sea el bueno', async () => {
      const html = new Uint8Array(Buffer.from('<!doctype html><script>alert(1)</script>'));

      const result = await getPhoto({ download: downloader({ bytes: html }) }, GOOGLE);

      expect(result).toEqual({ found: false, reason: 'no_es_una_imagen' });
    });

    it('un cuerpo vacío no es una imagen', async () => {
      const result = await getPhoto({ download: downloader({ bytes: new Uint8Array() }) }, GOOGLE);

      expect(result).toEqual({ found: false, reason: 'no_es_una_imagen' });
    });
  });

  it('sin foto, no hay nada que servir ni que bajar', async () => {
    const download = downloader();

    expect(await getPhoto({ download }, '')).toEqual({ found: false, reason: 'sin_foto' });
    expect(download).not.toHaveBeenCalled();
  });

  it('un data URL que pasa el máximo es "muy_grande"', async () => {
    const grande = Buffer.alloc(PHOTO_MAX_BYTES + 1, 1);

    const result = await getPhoto(
      { download: downloader() },
      `data:image/png;base64,${grande.toString('base64')}`,
    );

    // Por motivo y no con `toEqual` del objeto: si fallara, volcaría medio megabyte de bytes.
    expect(result.found ? 'se sirvió' : result.reason).toBe('muy_grande');
  });
});
