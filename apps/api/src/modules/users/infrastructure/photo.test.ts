import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { startTestApi, type TestHarness } from '../../../test/harness.ts';
import { createTestSession } from '../../../test/session.ts';
import { PHOTO_MAX_BYTES, photoEtag } from '../domain/photo.ts';

/*
 * La foto del usuario (F9-08, spec §5.6). Contra la API completa y Mongo, con el `fetch` del
 * proveedor inyectado: la foto de Google nunca se baja de verdad. Lo que se prueba es lo que la hace
 * peligrosa —de qué host baja la API, qué tipo sirve, qué pasa si el proveedor se cuelga— y lo que
 * hace que no se note: que se revalide con un 304 sin volver a pedirle nada al proveedor.
 */

/** Un PNG, un JPEG y un WebP de verdad (las firmas y un poco de relleno): lo que sirve la API. */
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 1, 2, 3]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 9, 8, 7]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x24, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
]);

const GOOGLE = 'https://lh3.googleusercontent.com/a/ACg8ocJ-Foto=s96-c';
/** `space`: Better Auth arma el data URL de Microsoft con un espacio después de la coma. */
const dataUrl = (type: string, bytes: Buffer, space = '') =>
  `data:${type};base64,${space}${bytes.toString('base64')}`;

describe('GET /api/v1/me/photo (F9-08)', () => {
  let harness: TestHarness;
  /** El `fetch` del proveedor: cada test fija qué contesta Google. */
  const providerFetch = vi.fn<typeof fetch>();
  let userCount = 0;

  beforeAll(async () => {
    harness = await startTestApi({ photo: { fetch: providerFetch, timeoutMs: 300 } });
  });

  afterAll(async () => {
    await harness.stop();
  });

  beforeEach(() => {
    providerFetch.mockReset();
    providerFetch.mockRejectedValue(new Error('el test no esperaba bajar nada'));
  });

  async function userWith(image?: string) {
    userCount += 1;
    return createTestSession(harness, {
      email: `foto${String(userCount)}@example.com`,
      name: `Foto ${String(userCount)}`,
      ...(image === undefined ? {} : { image }),
    });
  }

  function photoOf(cookie: string, headers: Record<string, string> = {}) {
    return harness.app.inject({
      method: 'GET',
      url: '/api/v1/me/photo',
      headers: { cookie, ...headers },
    });
  }

  const googleServes = (bytes: Buffer, headers: Record<string, string> = {}) => {
    providerFetch.mockResolvedValue(
      new Response(new Uint8Array(bytes), {
        status: 200,
        headers: { 'content-type': 'image/png', ...headers },
      }),
    );
  };

  describe('con una foto de Microsoft (data URL)', () => {
    it('sirve la imagen con su Content-Type y un ETag, sin tocar al proveedor', async () => {
      const { cookie } = await userWith(dataUrl('image/jpeg', JPEG));

      const response = await photoOf(cookie);

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(response.rawPayload.equals(JPEG)).toBe(true);
      expect(response.headers.etag).toMatch(/^"[0-9a-f]{32}"$/);
      expect(providerFetch).not.toHaveBeenCalled();
    });

    it('tolera el espacio después de la coma, como lo arma Better Auth', async () => {
      const { cookie } = await userWith(dataUrl('image/png', PNG, ' '));

      const response = await photoOf(cookie);

      expect(response.statusCode).toBe(200);
      expect(response.rawPayload.equals(PNG)).toBe(true);
    });

    it('con If-None-Match igual al ETag, 304 y sin cuerpo', async () => {
      const image = dataUrl('image/webp', WEBP);
      const { cookie } = await userWith(image);
      const first = await photoOf(cookie);

      const again = await photoOf(cookie, { 'if-none-match': String(first.headers.etag) });

      expect(first.statusCode).toBe(200);
      expect(again.statusCode).toBe(304);
      expect(again.body).toBe('');
      expect(again.headers.etag).toBe(first.headers.etag);
      expect(again.headers.etag).toBe(photoEtag(image));
    });

    it('con un If-None-Match de otra foto, se vuelve a servir entera', async () => {
      const { cookie } = await userWith(dataUrl('image/png', PNG));

      const response = await photoOf(cookie, { 'if-none-match': '"de-otra-foto"' });

      expect(response.statusCode).toBe(200);
      expect(response.rawPayload.equals(PNG)).toBe(true);
    });

    it('revalida y no se guarda sin preguntar: privado, con ETag y variando por cookie', async () => {
      const { cookie } = await userWith(dataUrl('image/png', PNG));

      const response = await photoOf(cookie);

      expect(response.headers['cache-control']).toBe('private, no-cache');
      expect(response.headers.vary).toContain('Cookie');
    });
  });

  describe('con una foto de Google (URL)', () => {
    it('la baja de googleusercontent.com y la sirve', async () => {
      const { cookie } = await userWith(GOOGLE);
      googleServes(PNG);

      const response = await photoOf(cookie);

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
      expect(response.rawPayload.equals(PNG)).toBe(true);
      expect(providerFetch).toHaveBeenCalledOnce();
      // El downloader le pasa a fetch la URL ya parseada, no el texto.
      expect(providerFetch.mock.calls[0]?.[0]).toEqual(new URL(GOOGLE));
    });

    it('con If-None-Match, 304 sin volver a pedirle nada a Google', async () => {
      const { cookie } = await userWith(GOOGLE);
      googleServes(PNG);
      const first = await photoOf(cookie);
      providerFetch.mockClear();

      const again = await photoOf(cookie, { 'if-none-match': String(first.headers.etag) });

      expect(again.statusCode).toBe(304);
      expect(providerFetch).not.toHaveBeenCalled();
    });

    it('el tipo que sirve es el de los bytes, no el Content-Type que mande el CDN', async () => {
      const { cookie } = await userWith(GOOGLE);
      googleServes(JPEG, { 'content-type': 'text/html' });

      const response = await photoOf(cookie);

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('image/jpeg');
    });
  });

  describe('lo que no se baja ni se sirve nunca', () => {
    it.each([
      ['otro host', 'https://example.com/foto.png'],
      ['http, sin cifrar', 'http://lh3.googleusercontent.com/a'],
      ['un host que sólo termina parecido', 'https://evilgoogleusercontent.com/a'],
      ['un subdominio ajeno', 'https://lh3.googleusercontent.com.evil.example/a'],
      ['credenciales para otro host', 'https://lh3.googleusercontent.com@evil.example/a'],
      ['la IP de metadatos de la nube', 'https://169.254.169.254/latest/meta-data/'],
      ['localhost', 'https://localhost/foto.png'],
      ['un archivo local', 'file:///etc/passwd'],
      ['una ruta relativa', '/api/v1/me/photo'],
    ])('%s: 404 y no sale ningún pedido', async (_name, image) => {
      const { cookie } = await userWith(image);

      const response = await photoOf(cookie);

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ errorCode: 'WC-USER-404-001' });
      expect(providerFetch).not.toHaveBeenCalled();
    });

    it.each([
      [
        'un SVG (serviría script en el origen de la app)',
        dataUrl(
          'image/svg+xml',
          Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
        ),
      ],
      ['HTML', dataUrl('text/html', Buffer.from('<script>alert(1)</script>'))],
      ['un GIF', dataUrl('image/gif', Buffer.from('GIF89a'))],
      ['un data URL sin base64', 'data:text/html,<script>alert(1)</script>'],
      [
        'un tipo permitido con bytes que no son una imagen',
        dataUrl('image/png', Buffer.from('<script>alert(1)</script>')),
      ],
      ['uno más grande que el máximo', dataUrl('image/png', Buffer.alloc(PHOTO_MAX_BYTES + 1, 1))],
    ])('un data URL con %s: 404', async (_name, image) => {
      const { cookie } = await userWith(image);

      const response = await photoOf(cookie);

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ errorCode: 'WC-USER-404-001' });
    });

    it.each([
      ['HTML', Buffer.from('<!doctype html><script>alert(1)</script>')],
      [
        'un SVG',
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
      ],
      ['vacío', Buffer.alloc(0)],
      ['más grande que el máximo', Buffer.concat([PNG, Buffer.alloc(PHOTO_MAX_BYTES, 1)])],
    ])('si Google contesta %s: 404', async (_name, bytes) => {
      const { cookie } = await userWith(GOOGLE);
      googleServes(bytes);

      const response = await photoOf(cookie);

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ errorCode: 'WC-USER-404-001' });
    });

    it('el 404 no deja ETag ni caché: un error guardado taparía la foto cuando vuelva', async () => {
      const { cookie } = await userWith('https://example.com/foto.png');

      const response = await photoOf(cookie);

      expect(response.statusCode).toBe(404);
      expect(response.headers.etag).toBeUndefined();
      expect(response.headers['cache-control']).toBe('no-store');
    });
  });

  describe('sin foto, o con el proveedor caído', () => {
    it.each(['', '   '])(
      'un user.image vacío (%j) es lo mismo que no tener: hasPhoto false y 404',
      async (image) => {
        const { cookie } = await userWith(image);

        const me = await harness.app.inject({
          method: 'GET',
          url: '/api/v1/me',
          headers: { cookie },
        });
        const photo = await photoOf(cookie);

        expect(me.json()).toMatchObject({ hasPhoto: false });
        expect(photo.statusCode).toBe(404);
        expect(providerFetch).not.toHaveBeenCalled();
      },
    );

    it('un usuario sin foto: 404 WC-USER-404-001 con el mensaje del catálogo', async () => {
      const { cookie } = await userWith();

      const response = await photoOf(cookie);

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({
        errorCode: 'WC-USER-404-001',
        message: 'No hay una foto para mostrar.',
      });
      expect(providerFetch).not.toHaveBeenCalled();
    });

    it('con Google caído (la red falla): 404, no un 500', async () => {
      const { cookie } = await userWith(GOOGLE);
      providerFetch.mockRejectedValue(new TypeError('fetch failed'));

      const response = await photoOf(cookie);

      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ errorCode: 'WC-USER-404-001' });
    });

    it('con Google contestando un 500: 404', async () => {
      const { cookie } = await userWith(GOOGLE);
      providerFetch.mockResolvedValue(new Response('error', { status: 500 }));

      const response = await photoOf(cookie);

      expect(response.statusCode).toBe(404);
    });

    it('con Google que no contesta: corta por tiempo y da 404', async () => {
      const { cookie } = await userWith(GOOGLE);
      providerFetch.mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new Error('cortado por el tiempo máximo'));
            });
          }),
      );
      const started = Date.now();

      const response = await photoOf(cookie);

      expect(response.statusCode).toBe(404);
      expect(Date.now() - started).toBeLessThan(3000);
    });

    it('el motivo no se le cuenta al cliente: el cuerpo es sólo el envelope del catálogo', async () => {
      const { cookie } = await userWith('https://example.com/foto.png');

      const response = await photoOf(cookie);

      expect(response.body).not.toContain('origen_no_permitido');
      expect(response.body).not.toContain('example.com');
    });
  });

  describe('quién puede pedirla', () => {
    it('sin sesión, 401', async () => {
      const response = await harness.app.inject({ method: 'GET', url: '/api/v1/me/photo' });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({ errorCode: 'WC-AUTH-401-004' });
    });

    it('con una cookie inventada, 401', async () => {
      const response = await photoOf('better-auth.session_token=inventada.firma');

      expect(response.statusCode).toBe(401);
    });

    it('cada uno recibe la suya: la URL no lleva id', async () => {
      const ana = await userWith(dataUrl('image/png', PNG));
      const beto = await userWith(dataUrl('image/jpeg', JPEG));

      const deAna = await photoOf(ana.cookie);
      const deBeto = await photoOf(beto.cookie);

      expect(deAna.rawPayload.equals(PNG)).toBe(true);
      expect(deBeto.rawPayload.equals(JPEG)).toBe(true);
    });

    it('no hay forma de pedir la de otro: una ruta con id no existe', async () => {
      const ana = await userWith(dataUrl('image/png', PNG));
      const beto = await userWith();

      for (const url of [
        `/api/v1/users/${ana.userId}/photo`,
        `/api/v1/me/photo/${ana.userId}`,
        `/api/v1/me/photo?userId=${ana.userId}`,
      ]) {
        const response = await harness.app.inject({
          method: 'GET',
          url,
          headers: { cookie: beto.cookie },
        });
        // O no existe, o ignora el parámetro y le da la suya (que no tiene): nunca la de Ana.
        expect(response.rawPayload.equals(PNG)).toBe(false);
        expect(response.statusCode).toBe(404);
      }
    });
  });

  describe('GET /api/v1/me', () => {
    it('con foto dice hasPhoto, y no lleva la URL ni el data URL', async () => {
      const microsoft = await userWith(dataUrl('image/jpeg', JPEG));
      const google = await userWith(GOOGLE);

      for (const { cookie } of [microsoft, google]) {
        const response = await harness.app.inject({
          method: 'GET',
          url: '/api/v1/me',
          headers: { cookie },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({ hasPhoto: true });
        expect(response.json()).not.toHaveProperty('image');
        expect(response.body).not.toContain('data:');
        expect(response.body).not.toContain('base64');
        expect(response.body).not.toContain('googleusercontent');
      }
    });

    it('sin foto dice hasPhoto: false', async () => {
      const { cookie } = await userWith();

      const response = await harness.app.inject({
        method: 'GET',
        url: '/api/v1/me',
        headers: { cookie },
      });

      expect(response.json()).toMatchObject({ hasPhoto: false });
    });
  });

  describe('headers', () => {
    it('la CSP y los de siempre no cambian con la foto: se sirve desde el origen de la API', async () => {
      const { cookie } = await userWith(dataUrl('image/png', PNG));
      const baseline = await harness.app.inject({ method: 'GET', url: '/health' });

      const response = await photoOf(cookie);

      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toBe(
        baseline.headers['content-security-policy'],
      );
      expect(response.headers['strict-transport-security']).toBe(
        baseline.headers['strict-transport-security'],
      );
      expect(response.headers['referrer-policy']).toBe(baseline.headers['referrer-policy']);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      // La CSP sigue sin nombrar a Google ni a Microsoft: la foto no sale de su origen.
      expect(response.headers['content-security-policy']).not.toMatch(/google|microsoft/);
    });

    it('se puede embeber desde el front aunque esté en otro origen del mismo sitio (desarrollo)', async () => {
      const { cookie } = await userWith(dataUrl('image/png', PNG));

      const response = await photoOf(cookie);

      expect(response.headers['cross-origin-resource-policy']).toBe('same-site');
    });
  });
});
