import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, createHttpClient, UNREACHABLE_ERROR_CODE } from './http.ts';

const okSchema = z.object({ ok: z.boolean() });

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function clientWith(fetchImpl: typeof fetch) {
  return createHttpClient({
    baseUrl: 'http://api.test',
    fetch: fetchImpl,
    newRequestId: () => 'req-front-1',
  });
}

describe('cliente HTTP', () => {
  it('manda x-request-id, credenciales y JSON, contra la URL de la API', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { ok: true }));

    await clientWith(fetchMock).request(okSchema, '/api/v1/cosa', {
      method: 'POST',
      body: { a: 1 },
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('http://api.test/api/v1/cosa');
    expect(init?.method).toBe('POST');
    expect(init?.credentials).toBe('include');
    expect(init?.body).toBe('{"a":1}');
    const headers = new Headers(init?.headers);
    expect(headers.get('x-request-id')).toBe('req-front-1');
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('sin cuerpo, no declara content-type', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { ok: true }));

    await clientWith(fetchMock).request(okSchema, '/api/v1/cosa');

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('GET');
    expect(new Headers(init?.headers).has('content-type')).toBe(false);
  });

  it('devuelve la respuesta validada con el schema compartido', async () => {
    const client = clientWith(
      vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { ok: true })),
    );

    await expect(client.request(okSchema, '/x')).resolves.toEqual({ ok: true });
  });

  it('una respuesta fuera de contrato es un error, no un dato a medias', async () => {
    const client = clientWith(
      vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { ok: 'sí' })),
    );

    await expect(client.request(okSchema, '/x')).rejects.toThrow(/fuera de contrato/);
  });

  it('un 204 no tiene cuerpo', async () => {
    const client = clientWith(
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 })),
    );

    await expect(
      client.request(z.undefined(), '/x', { method: 'DELETE' }),
    ).resolves.toBeUndefined();
  });

  it('un error de la API llega como ApiError con errorCode, requestId y detalle', async () => {
    const client = clientWith(
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse(400, {
          errorCode: 'WC-SYS-400-002',
          message: 'Revisá los datos enviados.',
          requestId: 'req-front-1',
          details: [{ path: 'value', message: 'Requerido' }],
        }),
      ),
    );

    const error = await client.request(okSchema, '/x').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      errorCode: 'WC-SYS-400-002',
      message: 'Revisá los datos enviados.',
      requestId: 'req-front-1',
      details: [{ path: 'value', message: 'Requerido' }],
    });
  });

  it('una respuesta de error sin envelope (un proxy caído) igual trae código y requestId', async () => {
    const client = clientWith(
      vi.fn<typeof fetch>().mockResolvedValue(new Response('<html>502</html>', { status: 502 })),
    );

    const error = await client.request(okSchema, '/x').catch((e: unknown) => e);

    expect(error).toMatchObject({
      status: 502,
      errorCode: UNREACHABLE_ERROR_CODE,
      requestId: 'req-front-1',
    });
  });

  it('sin red, también: estado 0 y el requestId que mandó el front', async () => {
    const client = clientWith(
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    const error = await client.request(okSchema, '/x').catch((e: unknown) => e);

    expect(error).toMatchObject({
      status: 0,
      errorCode: UNREACHABLE_ERROR_CODE,
      requestId: 'req-front-1',
    });
  });

  it('por defecto genera un requestId distinto por pedido', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(() => Promise.resolve(jsonResponse(200, { ok: true })));
    const client = createHttpClient({ baseUrl: '', fetch: fetchMock });

    await client.request(okSchema, '/x');
    await client.request(okSchema, '/x');

    const ids = fetchMock.mock.calls.map(([, init]) =>
      new Headers(init?.headers).get('x-request-id'),
    );
    expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('sin fetch explícito, usa el del navegador', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await createHttpClient({ baseUrl: '' }).request(okSchema, '/x');

    expect(fetchMock).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
