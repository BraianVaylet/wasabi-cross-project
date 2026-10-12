import { describe, expect, it, vi } from 'vitest';
import {
  PHOTO_MAX_BYTES,
  etagMatches,
  isGoogleUserContentUrl,
  photoEtag,
  photoSourceOf,
  sniffPhotoType,
} from './photo.ts';

/*
 * La foto del usuario (F9-08, spec §5.6). El `user.image` que guarda Better Auth lo escribe el
 * proveedor, y la API sirve esa imagen desde su propio origen: lo que decide qué se baja, qué se
 * sirve y con qué tipo es la parte que no puede fallar. Una URL que se baja desde la API es un SSRF
 * si se elige mal el host; una imagen servida con un tipo de más es un script en el origen de la app.
 */

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x24, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
]);

const dataUrl = (type: string, bytes: Buffer, separator = ',') =>
  `data:${type};base64${separator}${bytes.toString('base64')}`;

describe('sniffPhotoType — qué es de verdad lo que llegó', () => {
  it.each([
    ['PNG', PNG, 'image/png'],
    ['JPEG', JPEG, 'image/jpeg'],
    ['WebP', WEBP, 'image/webp'],
  ])('reconoce un %s por sus primeros bytes', (_name, bytes, type) => {
    expect(sniffPhotoType(bytes)).toBe(type);
  });

  it.each([
    [
      'un SVG',
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
    ],
    ['HTML', Buffer.from('<!doctype html><script>alert(1)</script>')],
    ['un GIF, que no se sirve', Buffer.from('GIF89a......')],
    [
      'un RIFF que no es WebP (un WAV)',
      Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE')]),
    ],
    ['vacío', Buffer.alloc(0)],
    ['un PNG cortado', PNG.subarray(0, 4)],
    ['un JPEG cortado, sin su tercer byte', Buffer.from([0xff, 0xd8])],
  ])('no reconoce %s', (_name, bytes) => {
    expect(sniffPhotoType(bytes)).toBeNull();
  });
});

describe('isGoogleUserContentUrl — el único host del que la API baja una foto', () => {
  it.each([
    'https://lh3.googleusercontent.com/a/ACg8ocJ=s96-c',
    'https://lh4.googleusercontent.com/-abc/photo.jpg',
    'https://LH3.GoogleUserContent.com/a/x',
    'https://a.b.googleusercontent.com/x',
  ])('acepta %s', (url) => {
    expect(isGoogleUserContentUrl(new URL(url))).toBe(true);
  });

  it.each([
    ['http, sin cifrar', 'http://lh3.googleusercontent.com/a'],
    ['otro host', 'https://example.com/a.png'],
    ['un host que sólo termina parecido', 'https://evilgoogleusercontent.com/a'],
    [
      'googleusercontent.com como subdominio ajeno',
      'https://lh3.googleusercontent.com.evil.example/a',
    ],
    ['el dominio pelado, sin subdominio', 'https://googleusercontent.com/a'],
    [
      'credenciales en la URL (el host real es el de después de la @)',
      'https://lh3.googleusercontent.com@evil.example/a',
    ],
    ['usuario y contraseña', 'https://user:pass@lh3.googleusercontent.com/a'],
    ['sólo un usuario', 'https://user@lh3.googleusercontent.com/a'],
    ['sólo una contraseña', 'https://:pass@lh3.googleusercontent.com/a'],
    ['otro puerto', 'https://lh3.googleusercontent.com:8443/a'],
    ['un host interno', 'https://localhost/a'],
    ['una IP', 'https://127.0.0.1/a'],
    ['una IP de metadatos de la nube', 'https://169.254.169.254/latest/meta-data'],
    ['un host con punto final', 'https://lh3.googleusercontent.com./a'],
    ['un archivo local', 'file:///etc/passwd'],
    ['un javascript:', 'javascript:alert(1)'],
  ])('rechaza %s', (_name, url) => {
    expect(isGoogleUserContentUrl(new URL(url))).toBe(false);
  });

  it('acepta el puerto 443 explícito, que es el de siempre', () => {
    expect(isGoogleUserContentUrl(new URL('https://lh3.googleusercontent.com:443/a'))).toBe(true);
  });
});

describe('photoSourceOf — de dónde sale la foto', () => {
  describe('un data URL (Microsoft)', () => {
    it('se decodifica y devuelve los bytes', () => {
      const source = photoSourceOf(dataUrl('image/jpeg', JPEG));

      expect(source).toEqual({ kind: 'inline', bytes: new Uint8Array(JPEG) });
    });

    it('tolera el espacio después de la coma, que es como lo arma Better Auth', () => {
      const source = photoSourceOf(dataUrl('image/jpeg', JPEG, ', '));

      expect(source).toEqual({ kind: 'inline', bytes: new Uint8Array(JPEG) });
    });

    it('tolera saltos de línea en el base64', () => {
      const base64 = JPEG.toString('base64');
      const source = photoSourceOf(
        `data:image/jpeg;base64,${base64.slice(0, 6)}\n${base64.slice(6)}`,
      );

      expect(source).toEqual({ kind: 'inline', bytes: new Uint8Array(JPEG) });
    });

    it.each(['image/png', 'image/jpeg', 'image/webp', 'IMAGE/JPEG'])(
      'acepta el tipo %s',
      (type) => {
        expect(photoSourceOf(dataUrl(type, PNG)).kind).toBe('inline');
      },
    );

    it.each([
      [
        'un SVG, que serviría script en el origen de la app',
        dataUrl('image/svg+xml', Buffer.from('<svg/>')),
      ],
      ['HTML', dataUrl('text/html', Buffer.from('<script>alert(1)</script>'))],
      ['un GIF', dataUrl('image/gif', Buffer.from('GIF89a'))],
      ['un data URL que no es base64', 'data:text/html,<script>alert(1)</script>'],
      ['un data URL sin tipo', `data:;base64,${PNG.toString('base64')}`],
    ])('rechaza %s', (_name, value) => {
      expect(photoSourceOf(value)).toEqual({ kind: 'rejected', reason: 'tipo_no_permitido' });
    });

    it('rechaza un data URL con base64 inválido', () => {
      expect(photoSourceOf('data:image/png;base64,@@@@')).toEqual({
        kind: 'rejected',
        reason: 'tipo_no_permitido',
      });
    });

    it('rechaza uno vacío', () => {
      expect(photoSourceOf('data:image/png;base64,')).toEqual({
        kind: 'rejected',
        reason: 'no_es_una_imagen',
      });
    });

    it('rechaza uno que pasa el máximo por un solo byte: su base64 todavía entra, se mide decodificado', () => {
      const grande = Buffer.alloc(PHOTO_MAX_BYTES + 1, 1);

      const source = photoSourceOf(dataUrl('image/png', grande));

      // Por motivo y no con `toEqual` del objeto: si fallara, volcaría medio megabyte de bytes.
      expect(source.kind === 'rejected' ? source.reason : source.kind).toBe('muy_grande');
    });

    it('uno enorme se rechaza por su largo, sin decodificarlo: no se gasta memoria en lo que se va a tirar', () => {
      const enorme = dataUrl('image/png', Buffer.alloc(PHOTO_MAX_BYTES * 4, 1));
      const decodificar = vi.spyOn(Buffer, 'from');

      const source = photoSourceOf(enorme);
      const llamadas: unknown[][] = decodificar.mock.calls;
      const decodificados = llamadas.filter((llamada) => llamada[1] === 'base64');
      decodificar.mockRestore();

      expect(source.kind === 'rejected' ? source.reason : source.kind).toBe('muy_grande');
      expect(decodificados).toHaveLength(0);
    });

    it('acepta uno justo en el máximo', () => {
      const justo = Buffer.alloc(PHOTO_MAX_BYTES, 1);

      expect(photoSourceOf(dataUrl('image/png', justo)).kind).toBe('inline');
    });
  });

  describe('una URL (Google)', () => {
    it('la de googleusercontent.com se baja', () => {
      const source = photoSourceOf('https://lh3.googleusercontent.com/a/ACg8oc=s96-c');

      expect(source.kind).toBe('remote');
      expect(source.kind === 'remote' && source.url.href).toBe(
        'https://lh3.googleusercontent.com/a/ACg8oc=s96-c',
      );
    });

    it.each([
      'https://example.com/foto.png',
      'http://lh3.googleusercontent.com/a',
      'https://169.254.169.254/latest/meta-data',
      '/api/v1/me/photo',
      'foto.png',
      'ftp://lh3.googleusercontent.com/a',
      '//lh3.googleusercontent.com/a',
    ])('otro origen (%s) no se baja nunca', (value) => {
      expect(photoSourceOf(value)).toEqual({ kind: 'rejected', reason: 'origen_no_permitido' });
    });
  });

  it.each(['', '   ', '\n'])('sin foto (%j) no hay nada que servir', (value) => {
    expect(photoSourceOf(value)).toEqual({ kind: 'rejected', reason: 'sin_foto' });
  });
});

describe('photoEtag y etagMatches — revalidar sin volver a pedirle nada al proveedor', () => {
  it('el ETag sale del valor de user.image: el mismo valor, el mismo ETag', () => {
    expect(photoEtag('https://lh3.googleusercontent.com/a')).toBe(
      photoEtag('https://lh3.googleusercontent.com/a'),
    );
    expect(photoEtag('https://lh3.googleusercontent.com/a')).not.toBe(
      photoEtag('https://lh3.googleusercontent.com/b'),
    );
  });

  it('es un ETag fuerte, entre comillas, que no deja ver el valor', () => {
    const etag = photoEtag('data:image/png;base64,SECRETO');

    expect(etag).toMatch(/^"[0-9a-f]{32}"$/);
    expect(etag).not.toContain('SECRETO');
  });

  it.each([
    ['uno solo', '"abc"'],
    ['una lista', '"zzz", "abc", "yyy"'],
    ['uno débil', 'W/"abc"'],
    ['cualquiera', '*'],
  ])('coincide con %s', (_name, header) => {
    expect(etagMatches(header, '"abc"')).toBe(true);
  });

  it.each([
    ['otro ETag', '"otro"'],
    ['sin comillas', 'abc'],
    ['vacío', ''],
    ['sin header', undefined],
  ])('no coincide con %s', (_name, header) => {
    expect(etagMatches(header, '"abc"')).toBe(false);
  });
});
