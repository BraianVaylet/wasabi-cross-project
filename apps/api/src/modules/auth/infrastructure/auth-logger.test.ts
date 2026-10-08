import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { testEnv } from '../../../test/env.ts';
import { buildAuthLogger, safeLogFields } from './auth-logger.ts';

/*
 * El logger de Better Auth (F9-06, ADR-0012). Por defecto Better Auth escribe a `console`, fuera
 * del log estructurado y sin redacción, y a cada error le pasa los detalles: un callback con el
 * `state` roto vuelve como `{ code: 'state_mismatch', details: { state: '…' } }`. Acá escribe por
 * Pino, y de lo que recibe se queda con qué pasó, no con los valores.
 */

/** Un error como los que tira Better Auth: con un código, y con los valores en `details`. */
function betterAuthError(code: string, details: Record<string, unknown>) {
  return Object.assign(new Error('Failed to parse state'), {
    name: 'BetterAuthError',
    code,
    details,
  });
}

function capture(overrides = {}) {
  const stream = new PassThrough();
  const chunks: string[] = [];
  stream.on('data', (chunk: Buffer) => chunks.push(chunk.toString()));
  const logger = buildAuthLogger(testEnv({ LOG_LEVEL: 'info', ...overrides }), stream);
  return {
    log: logger.log,
    text: () => chunks.join(''),
    lines: () =>
      chunks
        .join('')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Record<string, unknown>),
  };
}

describe('safeLogFields', () => {
  it('de un error conserva el nombre y el código, y nada más', () => {
    const error = betterAuthError('state_mismatch', { state: 'st4t3-s3cr3t0' });

    expect(safeLogFields([error])).toEqual({ name: 'BetterAuthError', code: 'state_mismatch' });
  });

  it('de un objeto suelto conserva el proveedor', () => {
    expect(safeLogFields([{ provider: 'google', code: 'abc-s3cr3t-c0d3' }])).toEqual({
      provider: 'google',
      code: 'abc-s3cr3t-c0d3',
    });
    expect(safeLogFields([{ providerId: 'microsoft', url: '/x?code=1' }])).toEqual({
      providerId: 'microsoft',
    });
  });

  it('tira los strings, los números y lo que no es un objeto', () => {
    expect(safeLogFields(['code=abc&state=xyz', 42, null, undefined, true])).toEqual({});
  });

  it('tira los campos que no son strings, aunque se llamen igual', () => {
    expect(safeLogFields([{ name: { state: 'xyz' }, code: 42, provider: ['google'] }])).toEqual({});
  });

  it('tira el mensaje, el stack y los details aunque sean texto', () => {
    const textual = {
      message: 'invalid_grant: code=c0d3-s3cr3t0',
      stack: 'Error: x\n    at validateAuthorizationCode',
      details: 'state=st4t3-s3cr3t0',
    };

    expect(safeLogFields([textual])).toEqual({});
  });

  it('junta varios argumentos', () => {
    expect(safeLogFields([{ provider: 'google' }, betterAuthError('x', {})])).toEqual({
      provider: 'google',
      name: 'BetterAuthError',
      code: 'x',
    });
  });

  it('sin argumentos, sin campos', () => {
    expect(safeLogFields([])).toEqual({});
  });
});

describe('buildAuthLogger', () => {
  it('escribe el mensaje por Pino, con el mismo formato que el resto de los logs', () => {
    const { log, lines } = capture();
    log('error', 'Failed to parse state', betterAuthError('state_mismatch', { state: 'xyz' }));

    expect(lines()[0]).toMatchObject({
      level: 50,
      msg: 'Failed to parse state',
      env: 'test',
      service: 'api',
      component: 'better-auth',
      name: 'BetterAuthError',
      code: 'state_mismatch',
    });
    expect(lines()[0]?.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('no deja pasar el state, el code ni el stack de un error', () => {
    const { log, text } = capture();
    log(
      'error',
      'Failed to parse state',
      betterAuthError('state_mismatch', { state: 'st4t3-s3cr3t0', code: 'c0d3-s3cr3t0' }),
    );

    expect(text()).not.toContain('st4t3-s3cr3t0');
    expect(text()).not.toContain('c0d3-s3cr3t0');
    expect(text()).not.toContain('stack');
    expect(text()).not.toContain('details');
  });

  it.each([
    ['debug', 20],
    ['info', 30],
    ['warn', 40],
    ['error', 50],
  ] as const)('el nivel %s sale como %i', (level, pinoLevel) => {
    const { log, lines } = capture({ LOG_LEVEL: 'debug' });
    log(level, 'mensaje');

    expect(lines()[0]).toMatchObject({ level: pinoLevel, msg: 'mensaje' });
  });

  it('respeta el LOG_LEVEL del entorno', () => {
    const { log, lines } = capture({ LOG_LEVEL: 'error' });
    log('warn', 'esto no sale');
    log('error', 'esto sí');

    expect(lines()).toHaveLength(1);
  });
});
