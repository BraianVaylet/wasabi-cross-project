import { PassThrough } from 'node:stream';
import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import { testEnv } from '../test/env.ts';
import { buildLoggerOptions } from './logger.ts';

/** Captura lo que el logger escribe, para poder afirmar sobre el JSON real. */
function captureLogs(env = testEnv({ LOG_LEVEL: 'info' })) {
  const stream = new PassThrough();
  const chunks: string[] = [];
  stream.on('data', (chunk: Buffer) => chunks.push(chunk.toString()));

  const options = buildLoggerOptions(env);
  const log = pino(typeof options === 'object' ? options : {}, stream);

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

  it('nunca loguea datos de tarjeta', () => {
    const { log, lines } = captureLogs();
    log.info({ card: '4111111111111111', cvv: '123' }, 'pago');

    const line = JSON.stringify(lines()[0]);
    expect(line).not.toContain('4111111111111111');
    expect(line).not.toContain('123');
  });

  it('nunca loguea el header de autorización ni la cookie', () => {
    const { log, lines } = captureLogs();
    log.info(
      { req: { headers: { authorization: 'Bearer abc', cookie: 'session=abc', host: 'api' } } },
      'request',
    );

    const line = JSON.stringify(lines()[0]);
    expect(line).not.toContain('Bearer abc');
    expect(line).not.toContain('session=abc');
    // Lo que no es sensible sigue estando: la redacción es por path, no un borrón.
    expect(line).toContain('api');
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
});
