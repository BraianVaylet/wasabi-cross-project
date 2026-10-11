import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { buildLandingServer, defaultDistDir } from '../server/app.ts';

/*
 * El servidor estático de la landing (F10-11, ADR-0013, spec §13). Se prueba contra el build real de
 * producción que arma `global-setup.ts`, no contra un fixture: lo que importa es que la CSP y la caché
 * sean las que corresponden a **lo que el build de verdad produce** (todo el CSS en archivos, sin
 * JavaScript, sin estilos en línea). Cada regla tiene su prueba inversa: sacar helmet, cambiar la caché.
 */

const dist = inject('salidaProduccion');

describe('servidor estático de la landing', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildLandingServer({ root: dist });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  /** Una muestra de cada clase de respuesta: HTML, asset con hash, sin hash, health, un 404. */
  const MUESTRA = ['/', '/robots.txt', '/og.png', '/health', '/no-existe'] as const;

  describe('headers de seguridad (spec §13)', () => {
    it.each(MUESTRA)('%s trae HSTS, nosniff y Referrer-Policy', async (url) => {
      const response = await app.inject({ method: 'GET', url });

      expect(response.headers['strict-transport-security']).toBe(
        'max-age=31536000; includeSubDomains; preload',
      );
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['referrer-policy']).toBe('no-referrer');
    });

    it('un asset del build también', async () => {
      const html = await readFile(join(dist, 'index.html'), 'utf8');
      const css = /href="(\/_astro\/[^"]+\.css)"/.exec(html)?.[1];
      expect(css).toBeDefined();

      const response = await app.inject({ method: 'GET', url: css ?? '' });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('nunca pone una cookie: es un sitio sin sesión', async () => {
      for (const url of MUESTRA) {
        const response = await app.inject({ method: 'GET', url });

        expect(response.headers['set-cookie'], url).toBeUndefined();
      }
    });
  });

  describe('CSP: sin JavaScript y sin estilos en línea', () => {
    async function csp(url = '/'): Promise<Map<string, string[]>> {
      const header = (await app.inject({ method: 'GET', url })).headers['content-security-policy'];
      const directives = new Map<string, string[]>();
      for (const part of String(header).split(';')) {
        const [name, ...values] = part.trim().split(/\s+/);
        if (name) directives.set(name, values);
      }
      return directives;
    }

    it.each(MUESTRA)('%s lleva la misma CSP', async (url) => {
      const reference = await csp('/');

      expect(await csp(url)).toEqual(reference);
    });

    it('no admite scripts: script-src es none', async () => {
      expect((await csp()).get('script-src')).toEqual(["'none'"]);
    });

    it("no admite 'unsafe-inline' ni 'unsafe-eval' en ninguna directiva", async () => {
      const todas = [...(await csp()).values()].flat();

      expect(todas).not.toContain("'unsafe-inline'");
      expect(todas).not.toContain("'unsafe-eval'");
    });

    it('cierra el resto: nada de objetos, marcos, formularios ni conexiones', async () => {
      const directivas = await csp();

      expect(directivas.get('default-src')).toEqual(["'self'"]);
      expect(directivas.get('object-src')).toEqual(["'none'"]);
      expect(directivas.get('frame-ancestors')).toEqual(["'none'"]);
      expect(directivas.get('form-action')).toEqual(["'none'"]);
      expect(directivas.get('connect-src')).toEqual(["'none'"]);
      expect(directivas.get('base-uri')).toEqual(["'self'"]);
    });

    it('los estilos, las fuentes y las imágenes son sólo del propio origen, y sin data:', async () => {
      const directivas = await csp();

      expect(directivas.get('style-src')).toEqual(["'self'"]);
      expect(directivas.get('font-src')).toEqual(["'self'"]);
      expect(directivas.get('img-src')).toEqual(["'self'"]);
    });

    it('pide subir a HTTPS lo que quede en http', async () => {
      expect((await csp()).has('upgrade-insecure-requests')).toBe(true);
    });
  });

  describe('la CSP alcanza para lo que el build usa', () => {
    /**
     * Los recursos que el HTML pide: hojas de estilo, imágenes, fuentes precargadas, íconos. Un
     * `<link rel="canonical">` o `alternate` es una URL absoluta de SEO, no carga nada: la CSP no lo
     * gobierna.
     */
    function recursosDe(html: string): string[] {
      const refs = new Set<string>();
      for (const match of html.matchAll(/<link\b[^>]*>/g)) {
        const etiqueta = match[0];
        const rel = /\brel="([^"]+)"/.exec(etiqueta)?.[1] ?? '';
        if (/^(?:canonical|alternate|sitemap)$/.test(rel)) continue;
        const href = /\bhref="([^"]+)"/.exec(etiqueta)?.[1];
        if (href) refs.add(href);
      }
      for (const match of html.matchAll(/<(?:img|source|script)\b[^>]*\bsrc="([^"]+)"/g)) {
        refs.add(match[1] ?? '');
      }
      for (const match of html.matchAll(/\bsrcset="([^"]+)"/g)) {
        for (const candidato of (match[1] ?? '').split(',')) {
          refs.add(candidato.trim().split(/\s+/)[0] ?? '');
        }
      }
      return [...refs].filter(Boolean);
    }

    it('todo lo que pide el HTML es del propio origen y el servidor lo tiene', async () => {
      const html = await readFile(join(dist, 'index.html'), 'utf8');
      const recursos = recursosDe(html);
      expect(recursos.length).toBeGreaterThan(5);

      for (const recurso of recursos) {
        // Un `https://...` o un `//...` sería de otro origen: la CSP lo bloquearía.
        expect(recurso, `recurso de otro origen: ${recurso}`).toMatch(/^\/(?!\/)/);

        const response = await app.inject({ method: 'GET', url: recurso });
        expect(response.statusCode, recurso).toBe(200);
      }
    });

    it('lo que pide el CSS (las fuentes) también', async () => {
      const html = await readFile(join(dist, 'index.html'), 'utf8');
      const hojas = [...html.matchAll(/<link\b[^>]*\bhref="(\/_astro\/[^"]+\.css)"/g)].map(
        (match) => match[1] ?? '',
      );
      expect(hojas.length).toBeGreaterThan(0);

      let fuentes = 0;
      for (const hoja of hojas) {
        const css = (await app.inject({ method: 'GET', url: hoja })).body;
        expect(css, `${hoja} usa data:`).not.toContain('data:');

        for (const match of css.matchAll(/url\(([^)]+)\)/g)) {
          const url = (match[1] ?? '').replace(/^['"]|['"]$/g, '');
          expect(url, `url de otro origen en ${hoja}`).toMatch(/^\/(?!\/)/);
          expect((await app.inject({ method: 'GET', url })).statusCode, url).toBe(200);
          fuentes += 1;
        }
      }
      expect(fuentes).toBeGreaterThan(0);
    });

    it('el HTML no tiene <style>, style="" ni <script>: la CSP no tendría cómo admitirlos', async () => {
      for (const archivo of ['index.html', '404.html']) {
        const html = await readFile(join(dist, archivo), 'utf8');

        expect(html, archivo).not.toMatch(/<style[\s>]/);
        expect(html, archivo).not.toMatch(/\sstyle="/);
        expect(html, archivo).not.toMatch(/<script[\s>]/);
      }
    });
  });

  describe('caché', () => {
    /** Los `/_astro/...` que nombran el HTML y el CSS del build, filtrados por extensión. */
    async function assets(extension: RegExp): Promise<string[]> {
      const html = await readFile(join(dist, 'index.html'), 'utf8');
      const hojas = [...html.matchAll(/href="(\/_astro\/[^"]+\.css)"/g)].map((m) => m[1] ?? '');
      const css = await Promise.all(
        hojas.map(async (url) => (await app.inject({ method: 'GET', url })).body),
      );
      const refs = new Set(
        [...(html + css.join('\n')).matchAll(/\/_astro\/[^"')\s,]+/g)].map((m) => m[0]),
      );
      return [...refs].filter((url) => extension.test(url));
    }

    it.each([
      ['hoja de estilo', /\.css$/],
      ['fuente', /\.woff2$/],
      ['imagen', /\.webp$/],
    ])('un asset de /_astro/ (%s) se cachea un año, immutable', async (_nombre, extension) => {
      const muestras = await assets(extension);
      expect(muestras.length).toBeGreaterThan(0);

      for (const url of muestras) {
        const response = await app.inject({ method: 'GET', url });

        expect(response.statusCode, url).toBe(200);
        expect(response.headers['cache-control'], url).toBe('public, max-age=31536000, immutable');
      }
    });

    it.each(['/', '/og.png', '/robots.txt', '/sitemap.xml', '/favicon.ico', '/logo.svg'])(
      '%s se revalida: sin hash en el nombre, un cambio tiene que verse al recargar',
      async (url) => {
        const response = await app.inject({ method: 'GET', url });

        expect(response.statusCode).toBe(200);
        expect(response.headers['cache-control']).toBe('no-cache');
      },
    );

    it('revalidar es barato: con el ETag del HTML, un 304 sin cuerpo', async () => {
      const first = await app.inject({ method: 'GET', url: '/' });
      const etag = String(first.headers.etag);
      expect(etag).not.toBe('undefined');

      const again = await app.inject({
        method: 'GET',
        url: '/',
        headers: { 'if-none-match': etag },
      });

      expect(again.statusCode).toBe(304);
      expect(again.body).toBe('');
    });
  });

  describe('/health', () => {
    it('responde 200 con un JSON, sin caché, y no toca el disco', async () => {
      const response = await app.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
      expect(response.headers['cache-control']).toBe('no-store');
    });

    it('también por HEAD, que es lo que algunos chequeos usan', async () => {
      const response = await app.inject({ method: 'HEAD', url: '/health' });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('lo que no existe', () => {
    it('responde 404 con la página 404.html de la marca', async () => {
      const esperado = await readFile(join(dist, '404.html'), 'utf8');

      const response = await app.inject({ method: 'GET', url: '/no-existe' });

      expect(response.statusCode).toBe(404);
      expect(response.headers['content-type']).toMatch(/^text\/html/);
      expect(response.body).toBe(esperado);
    });

    it('no hay fallback de SPA: una ruta con Accept: text/html tampoco es el index', async () => {
      const index = await readFile(join(dist, 'index.html'), 'utf8');

      const response = await app.inject({
        method: 'GET',
        url: '/ejercicios/mex_00000000',
        headers: { accept: 'text/html' },
      });

      expect(response.statusCode).toBe(404);
      expect(response.body).not.toBe(index);
    });

    it('un asset que falta es un 404, no HTML con otro nombre', async () => {
      const response = await app.inject({ method: 'GET', url: '/_astro/no-existe.css' });

      expect(response.statusCode).toBe(404);
    });

    it('un 404 tampoco se cachea por heurística', async () => {
      const response = await app.inject({ method: 'GET', url: '/no-existe' });

      expect(response.headers['cache-control']).toBe('no-cache');
    });

    it('otro método que no sea GET o HEAD es un 404', async () => {
      for (const method of ['POST', 'PUT', 'DELETE'] as const) {
        const response = await app.inject({ method, url: '/' });

        expect(response.statusCode, method).toBe(404);
      }
    });

    it.each([
      '/../package.json',
      '/%2e%2e/package.json',
      '/%2e%2e/%2e%2e/%2e%2e/etc/passwd',
      '/_astro/../../package.json',
      '/.env',
      '/.git/config',
      '/_astro/',
    ])('%s no deja ver nada fuera de dist/, ni archivos ocultos, ni listados', async (url) => {
      const response = await app.inject({ method: 'GET', url });

      expect(response.statusCode).toBe(404);
      expect(response.body).not.toContain('"name": "@wasabi-cross/landing"');
    });
  });

  describe('arranque', () => {
    it('sin el build, no arranca y dice qué falta', async () => {
      await expect(buildLandingServer({ root: join(dist, 'no-hay-build') })).rejects.toThrow(
        /no hay un build/i,
      );
    });

    it('por defecto sirve apps/landing/dist', () => {
      const esperado = fileURLToPath(new URL('../dist', import.meta.url));

      expect(defaultDistDir()).toBe(esperado);
    });
  });
});

describe('páginas en su carpeta (privacidad y términos, F10-09)', () => {
  /** Un build mínimo: Astro deja `privacidad/index.html`, y la URL que se comparte no lleva la barra. */
  let raiz: string;
  let fixture: FastifyInstance;

  beforeAll(async () => {
    raiz = await mkdtemp(join(tmpdir(), 'landing-fixture-'));
    await mkdir(join(raiz, 'privacidad'));
    await writeFile(join(raiz, 'index.html'), '<!doctype html><title>inicio</title>');
    await writeFile(join(raiz, '404.html'), '<!doctype html><title>404</title>');
    await writeFile(join(raiz, 'privacidad', 'index.html'), '<!doctype html><title>priv</title>');
    // Un archivo oculto de verdad en la raíz servida: en el `dist/` real no hay ninguno, y sin uno
    // que servir, `dotfiles: 'ignore'` y `'allow'` se ven iguales.
    await writeFile(join(raiz, '.env'), 'SECRETO=que-nadie-deberia-ver');
    await mkdir(join(raiz, '.oculta'));
    await writeFile(join(raiz, '.oculta', 'nota.txt'), 'tampoco-esto');
    fixture = await buildLandingServer({ root: raiz });
    await fixture.ready();
  });

  afterAll(async () => {
    await fixture.close();
    await rm(raiz, { recursive: true, force: true });
  });

  it('/privacidad redirige a /privacidad/ y no se queda en un 404', async () => {
    const response = await fixture.inject({ method: 'GET', url: '/privacidad' });

    expect(response.statusCode).toBe(301);
    expect(response.headers.location).toBe('/privacidad/');
  });

  it.each(['/.env', '/.oculta/nota.txt'])(
    '%s existe en disco y no se sirve: los archivos ocultos son un 404',
    async (url) => {
      const response = await fixture.inject({ method: 'GET', url });

      expect(response.statusCode).toBe(404);
      expect(response.body).not.toContain('que-nadie-deberia-ver');
      expect(response.body).not.toContain('tampoco-esto');
    },
  );

  it('/privacidad/ sirve su index.html, con los headers de siempre', async () => {
    const response = await fixture.inject({ method: 'GET', url: '/privacidad/' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('<title>priv</title>');
    expect(response.headers['cache-control']).toBe('no-cache');
    expect(response.headers['content-security-policy']).toContain("script-src 'none'");
  });
});

describe('el proceso, tal como lo corre Railway', () => {
  const entrada = fileURLToPath(new URL('../server/server.ts', import.meta.url));

  /** Un puerto libre: se abre uno efímero y se cierra, para que el hijo pueda tomarlo. */
  function puertoLibre(): Promise<number> {
    return new Promise((resolve, reject) => {
      const probe = createServer();
      probe.once('error', reject);
      probe.listen(0, '127.0.0.1', () => {
        const address = probe.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        probe.close(() => {
          resolve(port);
        });
      });
    });
  }

  async function esperarHealth(port: number): Promise<Response> {
    const limite = Date.now() + 15_000;
    for (;;) {
      try {
        return await fetch(`http://127.0.0.1:${String(port)}/health`);
      } catch (error) {
        if (Date.now() > limite) throw error;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  it('arranca con `node server/server.ts` (TypeScript sin compilar) y sin un .env', async () => {
    const port = await puertoLibre();
    // Sólo lo que Railway pone: el puerto, y dónde está el build. Nada de `.env`, ni HOST.
    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      PORT: String(port),
      LANDING_DIST_DIR: dist,
      LOG_LEVEL: 'silent',
    };
    const proceso = spawn(process.execPath, [entrada], { env, stdio: 'ignore' });

    try {
      const response = await esperarHealth(port);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ status: 'ok' });
      const raiz = await fetch(`http://127.0.0.1:${String(port)}/`);
      expect(raiz.status).toBe(200);
      expect(raiz.headers.get('content-security-policy')).toContain("script-src 'none'");
    } finally {
      proceso.kill();
    }
  });
});
