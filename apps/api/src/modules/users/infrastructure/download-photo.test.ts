import { createServer, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createPhotoDownloader } from './download-photo.ts';

/*
 * La descarga de la foto de Google (F9-08). Los límites —tiempo, tamaño, redirecciones— son de lo que
 * un servidor ajeno puede hacerle a la API, así que se prueban contra un servidor de verdad en
 * 127.0.0.1 con el `fetch` real: un doble de `fetch` no demuestra que el tiempo corte un cuerpo que
 * no termina, ni que una redirección se rechace.
 */

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

describe('createPhotoDownloader', () => {
  let server: Server;
  let base: string;
  /** Qué hace el servidor con el próximo pedido: lo fija cada test. */
  let handle: (response: ServerResponse) => void = () => undefined;
  const requests: { url: string; headers: Record<string, string | string[] | undefined> }[] = [];

  beforeAll(async () => {
    server = createServer((request, response) => {
      requests.push({ url: request.url ?? '', headers: request.headers });
      handle(response);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  });

  const download = (options: Parameters<typeof createPhotoDownloader>[0] = {}) =>
    createPhotoDownloader({ timeoutMs: 2000, ...options })(new URL(`${base}/foto`));

  it('baja la imagen y devuelve sus bytes', async () => {
    handle = (response) => {
      response.writeHead(200, { 'content-type': 'image/png' }).end(PNG);
    };

    expect(await download()).toEqual({ bytes: new Uint8Array(PNG) });
  });

  it('el pedido es anónimo y pide sólo imágenes', async () => {
    handle = (response) => {
      response.writeHead(200).end(PNG);
    };
    requests.length = 0;

    await download();

    expect(requests).toHaveLength(1);
    expect(requests[0]?.headers.accept).toBe('image/png, image/jpeg, image/webp');
    expect(requests[0]?.headers.cookie).toBeUndefined();
    expect(requests[0]?.headers.authorization).toBeUndefined();
  });

  it.each([404, 403, 500, 503])('un %i es que el proveedor no respondió', async (status) => {
    handle = (response) => {
      response.writeHead(status).end('no');
    };

    expect(await download()).toEqual({ failure: 'proveedor_no_responde' });
  });

  it('no sigue las redirecciones: sacarían el pedido del host que se aprobó', async () => {
    handle = (response) => {
      // A otra ruta del mismo servidor: si la API la siguiera, se vería como un segundo pedido.
      response.writeHead(302, { location: `${base}/redirigido` }).end();
    };
    requests.length = 0;

    expect(await download()).toEqual({ failure: 'proveedor_no_responde' });
    // Y no fue a buscar lo que decía la redirección.
    expect(requests.map((request) => request.url)).toEqual(['/foto']);
  });

  it('una respuesta que declara más del máximo se corta sin leerla', async () => {
    handle = (response) => {
      response.writeHead(200, { 'content-length': String(1024 * 1024) });
      response.write(PNG);
      // No termina el cuerpo: si la API lo esperara, el test se colgaría hasta el tiempo máximo.
    };
    const started = Date.now();

    expect(await download({ maxBytes: 1024, timeoutMs: 5000 })).toEqual({ failure: 'muy_grande' });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('si miente o no declara el largo, igual se corta al pasarse, contando lo que llega', async () => {
    handle = (response) => {
      // Sin content-length (chunked): sólo se sabe lo que va llegando.
      response.writeHead(200);
      response.write(Buffer.alloc(600, 1));
      response.write(Buffer.alloc(600, 1));
      response.write(Buffer.alloc(600, 1));
    };
    const started = Date.now();

    expect(await download({ maxBytes: 1024, timeoutMs: 5000 })).toEqual({ failure: 'muy_grande' });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('justo en el máximo se acepta', async () => {
    const justo = Buffer.concat([PNG, Buffer.alloc(1024 - PNG.length, 7)]);
    handle = (response) => {
      response.writeHead(200).end(justo);
    };

    expect(await download({ maxBytes: 1024 })).toEqual({ bytes: new Uint8Array(justo) });
  });

  it('el tiempo máximo corta un servidor que contesta los headers y no termina el cuerpo', async () => {
    handle = (response) => {
      response.writeHead(200, { 'content-type': 'image/png' });
      response.write(PNG);
      // Sigue abierto, sin mandar más: el Perfil no se cuelga esperando.
    };
    const started = Date.now();

    expect(await download({ timeoutMs: 150 })).toEqual({ failure: 'proveedor_no_responde' });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('el tiempo máximo corta un servidor que ni contesta', async () => {
    handle = () => undefined;
    const started = Date.now();

    expect(await download({ timeoutMs: 150 })).toEqual({ failure: 'proveedor_no_responde' });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('un servidor que no existe es que el proveedor no respondió, no una excepción', async () => {
    const result = await createPhotoDownloader({ timeoutMs: 2000 })(
      new URL('http://127.0.0.1:1/foto'),
    );

    expect(result).toEqual({ failure: 'proveedor_no_responde' });
  });

  it('una respuesta sin cuerpo no es una imagen', async () => {
    const sinCuerpo = vi.fn(() => Promise.resolve({ ok: true, body: null }) as Promise<Response>);

    const result = await createPhotoDownloader({ fetch: sinCuerpo })(new URL(`${base}/foto`));

    expect(result).toEqual({ failure: 'proveedor_no_responde' });
  });

  it('le pide a fetch no seguir redirecciones y no mandar credenciales', async () => {
    const fake = vi.fn(() => Promise.resolve(new Response(PNG)));
    const url = new URL('https://lh3.googleusercontent.com/a');

    await createPhotoDownloader({ fetch: fake })(url);

    expect(fake).toHaveBeenCalledExactlyOnceWith(
      url,
      expect.objectContaining({ redirect: 'error', credentials: 'omit' }),
    );
  });
});
