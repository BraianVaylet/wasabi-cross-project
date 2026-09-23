import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.ts';
import { testEnv } from '../../test/env.ts';

/*
 * F3-03 (ADR-0007): la API sirve el front compilado. Mismo origen, así la cookie de sesión
 * viaja sin CORS ni dudas de SameSite. Las rutas de la SPA caen en el index.html; lo que
 * no es de la SPA sigue respondiendo el 404 de siempre, en JSON.
 */

const HTML = { accept: 'text/html,application/xhtml+xml' };

describe('la API sirve el front (F3-03)', () => {
  let dist: string;
  let app: FastifyInstance;

  beforeAll(async () => {
    dist = mkdtempSync(join(tmpdir(), 'wasabi-front-'));
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

  it('la raíz es el index.html', async () => {
    const response = await app.inject({ method: 'GET', url: '/', headers: HTML });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.body).toContain('Wasabi Cross');
  });

  it('una ruta de la SPA también cae en el index.html: la resuelve el router del front', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/ejercicios/mex_a1b2c3d4?pct=80',
      headers: HTML,
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Wasabi Cross');
  });

  it('los assets se sirven tal cual', async () => {
    const response = await app.inject({ method: 'GET', url: '/assets/index-abc123.js' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/javascript/);
    expect(response.body).toContain('console.log');
  });

  it('un asset que no existe es un 404, no el index.html con otro nombre', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/assets/falta-xyz.js',
      headers: { accept: '*/*' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ errorCode: 'WC-SYS-404-003' });
  });

  it('lo que es de la API sigue siendo JSON, aunque el navegador pida HTML', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/no-existe', headers: HTML });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ errorCode: 'WC-SYS-404-003' });
  });

  it('un POST a una ruta de la SPA no devuelve una página', async () => {
    const response = await app.inject({ method: 'POST', url: '/ejercicios', headers: HTML });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ errorCode: 'WC-SYS-404-003' });
  });

  it('los chequeos de salud no se tapan con el front', async () => {
    const response = await app.inject({ method: 'GET', url: '/health', headers: HTML });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });
  });
});

describe('sin front compilado (desarrollo)', () => {
  it('la API no sirve páginas: el front lo sirve Vite', async () => {
    const app = await buildApp({ env: testEnv() });

    const response = await app.inject({ method: 'GET', url: '/', headers: HTML });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ errorCode: 'WC-SYS-404-003' });
    await app.close();
  });
});
