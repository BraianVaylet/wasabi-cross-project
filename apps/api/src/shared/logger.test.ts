import { PassThrough } from 'node:stream';
import { pino } from 'pino';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testEnv } from '../test/env.ts';
import { buildLoggerOptions, withoutQuery } from './logger.ts';

/** Captura lo que el logger escribe, para poder afirmar sobre el JSON real. */
function captureLogs(env = testEnv({ LOG_LEVEL: 'info' })) {
  const stream = new PassThrough();
  const chunks: string[] = [];
  stream.on('data', (chunk: Buffer) => chunks.push(chunk.toString()));

  const log = pino(buildLoggerOptions(env), stream);

  return {
    log,
    lines: () =>
      chunks
        .join('')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Record<string, unknown>),
  };
}

describe('logger', () => {
  it('escribe el env y el service en cada línea (docs/architecture.md)', () => {
    const { log, lines } = captureLogs();
    log.info('arrancó');

    expect(lines()[0]).toMatchObject({ env: 'test', service: 'api' });
  });

  it('usa ts en ISO 8601, no el epoch de Pino', () => {
    const { log, lines } = captureLogs();
    log.info('arrancó');

    expect(lines()[0]?.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('nunca loguea una password, esté donde esté', () => {
    const { log, lines } = captureLogs();
    log.info({ password: 'hunter2', user: { password: 'hunter2' } }, 'registro');

    const line = JSON.stringify(lines()[0]);
    expect(line).not.toContain('hunter2');
    expect(line).toContain('[REDACTED]');
  });

  it('nunca loguea tokens ni secrets', () => {
    const { log, lines } = captureLogs();
    log.info(
      { token: 'tok_abc', accessToken: 'at_abc', refreshToken: 'rt_abc', secret: 's3cr3t' },
      'sesión',
    );

    const line = JSON.stringify(lines()[0]);
    expect(line).not.toContain('tok_abc');
    expect(line).not.toContain('at_abc');
    expect(line).not.toContain('rt_abc');
    expect(line).not.toContain('s3cr3t');
  });

  describe('nunca loguea datos de tarjeta', () => {
    // Reloj congelado: el ts (ISO 8601) no puede coincidir con el cvv por azar (ver bitácora).
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('redacta card y cvv', () => {
      const { log, lines } = captureLogs();
      log.info({ card: '4111111111111111', cvv: '123' }, 'pago');

      const line = JSON.stringify(lines()[0]);
      expect(line).not.toContain('4111111111111111');
      expect(line).not.toContain('123');
    });
  });

  it('nunca loguea el header de autorización ni la cookie', () => {
    const { log, lines } = captureLogs();
    // El serializador de `req` ya no deja pasar los headers; esto prueba la red de abajo, por si
    // alguien loguea el request crudo: con un serializador que lo devuelve tal cual.
    const crudo = log.child({}, { serializers: { req: (request: unknown) => request } });
    crudo.info(
      { req: { headers: { authorization: 'Bearer abc', cookie: 'session=abc', host: 'api' } } },
      'request',
    );

    const line = JSON.stringify(lines()[0]);
    expect(line).not.toContain('Bearer abc');
    expect(line).not.toContain('session=abc');
    // Lo que no es sensible sigue estando: la redacción es por path, no un borrón.
    expect(line).toContain('api');
  });

  describe('nada del flujo OAuth sale en un log (F9-06, ADR-0012)', () => {
    it('redacta el idToken, esté donde esté', () => {
      const { log, lines } = captureLogs();
      log.info({ idToken: 'eyJ.id.tok', profile: { idToken: 'eyJ.anidado.tok' } }, 'perfil');

      const line = JSON.stringify(lines()[0]);
      expect(line).not.toContain('eyJ.id.tok');
      expect(line).not.toContain('eyJ.anidado.tok');
      expect(line).toContain('[REDACTED]');
    });

    it('redacta el clientSecret, esté donde esté', () => {
      const { log, lines } = captureLogs();
      log.info(
        { clientSecret: 'cs-plano', google: { clientSecret: 'cs-de-google' } },
        'configuración',
      );

      const line = JSON.stringify(lines()[0]);
      expect(line).not.toContain('cs-plano');
      expect(line).not.toContain('cs-de-google');
    });

    it('el request que se loguea lleva el path, no el query: ni code ni state', () => {
      const { log, lines } = captureLogs();
      log.info(
        {
          req: {
            method: 'GET',
            url: '/api/auth/callback/google?code=abc&state=xyz',
            headers: { 'accept-version': '1.0.0' },
            host: 'api.example.com',
            ip: '203.0.113.7',
            socket: { remotePort: 4321 },
          },
        },
        'incoming request',
      );

      const [line] = lines();
      expect(JSON.stringify(line)).not.toMatch(/abc|xyz|code=|state=/);
      // Los mismos campos que el serializador de Fastify, con la URL sin query.
      expect(line).toMatchObject({
        req: {
          method: 'GET',
          url: '/api/auth/callback/google',
          version: '1.0.0',
          host: 'api.example.com',
          remoteAddress: '203.0.113.7',
          remotePort: 4321,
        },
      });
    });

    it('un req que no trae todo no rompe el log: se loguea lo que haya', () => {
      const { log, lines } = captureLogs();

      log.info({ req: {} }, 'incoming request');
      log.info({ req: { url: '/health' } }, 'incoming request');

      expect(lines()).toHaveLength(2);
      expect(lines()[1]).toMatchObject({ req: { url: '/health' } });
    });

    it('un `url` suelto en un log tampoco lleva el query', () => {
      const { log, lines } = captureLogs();
      log.warn({ url: '/api/auth/callback/google?code=abc&state=xyz' }, 'Better Auth rechazó');

      expect(JSON.stringify(lines()[0])).not.toMatch(/abc|xyz/);
      expect(lines()[0]).toMatchObject({ url: '/api/auth/callback/google' });
    });
  });

  it('un `url` que no es texto se deja como está', () => {
    const { log, lines } = captureLogs();
    log.info({ url: { host: 'api' } }, 'otra cosa llamada url');

    expect(lines()[0]).toMatchObject({ url: { host: 'api' } });
  });

  describe('withoutQuery', () => {
    it.each([
      ['/api/auth/callback/google?code=abc&state=xyz', '/api/auth/callback/google'],
      ['/api/v1/exercises?limit=10', '/api/v1/exercises'],
      ['/api/auth/callback/google?', '/api/auth/callback/google'],
      ['/api/auth/callback/google#fragmento', '/api/auth/callback/google'],
      ['/api/v1/me', '/api/v1/me'],
      ['/', '/'],
      ['', ''],
    ])('%s → %s', (url, expected) => {
      expect(withoutQuery(url)).toBe(expected);
    });
  });

  it('respeta el LOG_LEVEL configurado', () => {
    const { log, lines } = captureLogs(testEnv({ LOG_LEVEL: 'warn' }));
    log.info('esto no sale');
    log.warn('esto sí');

    expect(lines()).toHaveLength(1);
  });

  it('en desarrollo usa pino-pretty; en producción, JSON crudo', () => {
    expect(buildLoggerOptions(testEnv({ NODE_ENV: 'development' }))).toHaveProperty('transport');
    expect(buildLoggerOptions(testEnv({ NODE_ENV: 'production' }))).not.toHaveProperty('transport');
  });

  it('con un stream (los tests que leen el log) no hay transport, ni en desarrollo', () => {
    const options = buildLoggerOptions(testEnv({ NODE_ENV: 'development' }), new PassThrough());

    expect(options).not.toHaveProperty('transport');
    expect(options).toHaveProperty('stream');
  });
});
