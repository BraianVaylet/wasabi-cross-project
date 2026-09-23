import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.ts';
import { testEnv } from '../../test/env.ts';

/*
 * Los cuatro headers de spec §13, en cualquier respuesta de producción: una respuesta de
 * la API y una del front que la API sirve (F3-03, F3-05). Helmet los aplica en un `onSend`
 * global, así que tienen que estar en las dos, sin excepción.
 */

const HTML = { accept: 'text/html,application/xhtml+xml' };

describe('headers de seguridad (F3-06, spec §13)', () => {
  let dist: string;
  let app: FastifyInstance;

  beforeAll(async () => {
    dist = mkdtempSync(join(tmpdir(), 'wasabi-headers-'));
    writeFileSync(join(dist, 'index.html'), '<!doctype html><title>Wasabi Cross</title>');
    mkdirSync(join(dist, 'assets'));
    writeFileSync(join(dist, 'assets', 'index-abc123.js'), 'console.log("front")');

    app = await buildApp({ env: testEnv({ WEB_DIST_DIR: dist }) });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    rmSync(dist, { recursive: true, force: true });
  });

  it.each([
    ['una respuesta de la API', { method: 'GET' as const, url: '/health' }],
    ['el index.html que sirve el front', { method: 'GET' as const, url: '/', headers: HTML }],
    ['un asset del front', { method: 'GET' as const, url: '/assets/index-abc123.js' }],
    ['un 404 de la API', { method: 'GET' as const, url: '/api/v1/no-existe' }],
  ])('trae los cuatro headers en %s', async (_caso, request) => {
    const response = await app.inject(request);

    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBeDefined();
  });

  it('la CSP no permite scripts inline: el bootstrap del tema pasó a ser un archivo (F3-03)', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    const csp = response.headers['content-security-policy'] ?? '';
    // `script-src` sin ningún origen laxo detrás: nada de `unsafe-inline` ni `unsafe-eval`,
    // sólo `'self'`. El `style-src` sí lo permite —el default de helmet—, porque cubre el
    // único `style={{}}` inline de React (ExerciseDetailPage): sacarlo rompería esa pantalla,
    // y el criterio de esta tarea pide "sin `unsafe-inline` en scripts", no en estilos.
    const scriptSrc = /script-src ([^;]+)/.exec(csp)?.[1] ?? '';

    expect(scriptSrc.trim()).toBe("'self'");
  });

  it('el resto del sitio queda cerrado: sin marcos ajenos, sin objetos, todo por HTTPS', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    const csp = response.headers['content-security-policy'];

    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('HSTS pide un año, con subdominios y precarga', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.headers['strict-transport-security']).toBe(
      'max-age=31536000; includeSubDomains; preload',
    );
  });
});

describe('sin front compilado (desarrollo), la API igual trae sus headers', () => {
  it('no depende de WEB_DIST_DIR', async () => {
    const app = await buildApp({ env: testEnv() });

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    await app.close();
  });
});
