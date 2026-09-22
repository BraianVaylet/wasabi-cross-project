import { errorEnvelopeSchema } from '@wasabi-cross/schemas';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { buildApp } from '../../app.ts';
import { testEnv } from '../../test/env.ts';
import { AppError } from './app-error.ts';

describe('envelope de error', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ env: testEnv() });

    // eslint-disable-next-line @typescript-eslint/require-await -- la firma del plugin de Fastify es async
    await app.register(async (instance) => {
      const typed = instance.withTypeProvider<ZodTypeProvider>();

      typed.post(
        '/test/validacion',
        { schema: { body: z.object({ value: z.number().positive('Tiene que ser positivo') }) } },
        () => ({ ok: true }),
      );

      typed.get('/test/negocio', () => {
        throw new AppError('WC-RM-422-001', { meta: { value: -5 } });
      });

      typed.get('/test/negocio-500', () => {
        throw new AppError('WC-SYS-500-001', { message: 'detalle interno que no debe salir' });
      });

      typed.get('/test/explota', () => {
        throw new Error('referencia nula en el módulo de records');
      });

      typed.get('/test/explota-con-codigo', () => {
        // Un error de una dependencia que trae su propio 5xx: sigue siendo nuestro problema.
        throw Object.assign(new Error('el pool de Mongo se quedó sin conexiones'), {
          statusCode: 503,
        });
      });

      typed.get(
        '/test/con-rate-limit',
        { config: { rateLimit: { max: 1, timeWindow: '1 minute' } } },
        () => ({ ok: true }),
      );

      typed.get(
        '/test/respuesta-mentirosa',
        { schema: { response: { 200: z.object({ total: z.number() }) } } },
        // @ts-expect-error -- a propósito: la respuesta no respeta su propio schema
        () => ({ total: 'no soy un número' }),
      );
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('todo error respeta el envelope que lee el front (@wasabi-cross/schemas)', async () => {
    const responses = await Promise.all([
      app.inject({ method: 'GET', url: '/no-existe' }),
      app.inject({ method: 'POST', url: '/test/validacion', payload: { value: -1 } }),
      app.inject({ method: 'GET', url: '/test/negocio' }),
      app.inject({ method: 'GET', url: '/test/explota' }),
      app.inject({ method: 'GET', url: '/test/respuesta-mentirosa' }),
    ]);

    for (const response of responses) {
      expect(response.statusCode, response.body).toBeGreaterThanOrEqual(400);
      expect(errorEnvelopeSchema.safeParse(response.json()).success, response.body).toBe(true);
    }
  });

  it('una ruta inexistente responde 404 con WC-SYS-404-003', async () => {
    const response = await app.inject({ method: 'GET', url: '/no-existe' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      errorCode: 'WC-SYS-404-003',
      message: 'No encontramos lo que buscás.',
    });
  });

  it('un error de validación responde 400 con el detalle por campo', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/test/validacion',
      payload: { value: -1 },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      errorCode: 'WC-SYS-400-002',
      details: [{ path: 'value', message: 'Tiene que ser positivo' }],
    });
  });

  it('un campo faltante en la raíz del body también trae su path', async () => {
    const response = await app.inject({ method: 'POST', url: '/test/validacion', payload: {} });

    expect(response.json()).toMatchObject({ details: [{ path: 'value' }] });
  });

  it('un error de negocio responde con su código y el status del catálogo', async () => {
    const response = await app.inject({ method: 'GET', url: '/test/negocio' });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({
      errorCode: 'WC-RM-422-001',
      message: 'El valor cargado no es válido.',
    });
  });

  it('un error no controlado responde 500 sin filtrar el mensaje interno', async () => {
    const response = await app.inject({ method: 'GET', url: '/test/explota' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({ errorCode: 'WC-SYS-500-001' });
    expect(response.body).not.toContain('referencia nula');
  });

  it('un AppError 5xx tampoco filtra su mensaje interno', async () => {
    const response = await app.inject({ method: 'GET', url: '/test/negocio-500' });

    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain('detalle interno');
  });

  it('una respuesta que no respeta su schema es un 500 nuestro, no un 200 mentiroso', async () => {
    const response = await app.inject({ method: 'GET', url: '/test/respuesta-mentirosa' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({ errorCode: 'WC-SYS-500-001' });
  });

  it('todo error trae el requestId para poder rastrearlo', async () => {
    const response = await app.inject({ method: 'GET', url: '/test/negocio' });

    expect(response.json()).toHaveProperty('requestId');
  });

  it('usa el x-request-id que manda el front, para correlacionar de punta a punta', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/test/negocio',
      headers: { 'x-request-id': 'trazador-123' },
    });

    expect(response.json<{ requestId: string }>().requestId).toBe('trazador-123');
  });

  it('el rate limit responde 429 con el código del catálogo, no con el formato del plugin', async () => {
    await app.inject({ method: 'GET', url: '/test/con-rate-limit' });
    const response = await app.inject({ method: 'GET', url: '/test/con-rate-limit' });

    expect(response.statusCode).toBe(429);
    expect(response.json()).toMatchObject({
      errorCode: 'WC-AUTH-429-003',
      message: 'Demasiados intentos. Esperá un minuto y probá de nuevo.',
    });
    expect(response.json()).toHaveProperty('requestId');
  });

  describe('errores del cliente que detecta Fastify (F3-02)', () => {
    it('un JSON mal formado es un 400 del cliente, no un 500 nuestro', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/test/validacion',
        headers: { 'content-type': 'application/json' },
        payload: '{"value": ',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ errorCode: 'WC-SYS-400-002' });
    });

    it('un cuerpo demasiado grande responde 413, con el mismo envelope', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/test/validacion',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ value: 1, relleno: 'x'.repeat(2 * 1024 * 1024) }),
      });

      expect(response.statusCode).toBe(413);
      expect(errorEnvelopeSchema.safeParse(response.json()).success).toBe(true);
      expect(response.json()).toMatchObject({ errorCode: 'WC-SYS-400-002' });
    });

    it('un error con un 5xx propio sigue siendo un 500 nuestro, sin filtrar el mensaje', async () => {
      const response = await app.inject({ method: 'GET', url: '/test/explota-con-codigo' });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toMatchObject({ errorCode: 'WC-SYS-500-001' });
      expect(response.body).not.toContain('pool de Mongo');
    });

    it('un tipo de contenido que no se entiende responde 415, no 500', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/test/validacion',
        headers: { 'content-type': 'application/x-cualquier-cosa' },
        payload: 'hola',
      });

      expect(response.statusCode).toBe(415);
      expect(response.json()).toMatchObject({ errorCode: 'WC-SYS-400-002' });
    });
  });

  it('genera un requestId propio si el front no manda ninguno', async () => {
    const response = await app.inject({ method: 'GET', url: '/test/negocio' });

    expect(response.json<{ requestId: string }>().requestId).toMatch(/[0-9a-f-]{36}/);
  });
});
