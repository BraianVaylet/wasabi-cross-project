import { createServer, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { afterAll, describe, expect, inject, it } from 'vitest';
import { buildLandingServer } from '../server/app.ts';
import { formatearSmoke, smoke, type Chequeo } from '../src/lib/smoke.ts';

/*
 * El smoke de la landing (F10-13): las mismas comprobaciones que un humano haría con `curl` después
 * de un deploy, contra cualquier URL. Acá corre contra el servidor de producción (F10-11) sirviendo
 * los tres builds de test, y se prueba al revés: lo que tiene que fallar, falla y dice qué.
 */

const sinVariables = inject('salida');
const staging = inject('salidaConApp');
const produccion = inject('salidaProduccion');
const appUrl = inject('appUrl');
const siteUrl = inject('siteUrl');

const cierres: (() => Promise<void>)[] = [];
afterAll(async () => {
  await Promise.all(cierres.map((cerrar) => cerrar()));
});

/** El servidor de producción de la landing sobre un build, en un puerto libre. */
async function servir(dist: string): Promise<string> {
  const app = await buildLandingServer({ root: dist });
  await app.listen({ port: 0, host: '127.0.0.1' });
  cierres.push(() => app.close());
  const { port } = app.server.address() as AddressInfo;
  return `http://127.0.0.1:${String(port)}`;
}

/** Un servidor que sirve el HTML del build tal cual, sin un solo header de seguridad. */
async function servirSinHeaders(
  dist: string,
  headers: Record<string, string> = {},
): Promise<string> {
  const html = readFileSync(join(dist, 'index.html'));
  const server: Server = createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' }).end('{"status":"ok"}');
    } else {
      response.writeHead(200, { 'content-type': 'text/html', ...headers }).end(html);
    }
  });
  await new Promise<void>((resolver) => server.listen(0, '127.0.0.1', resolver));
  cierres.push(
    () =>
      new Promise<void>((resolver) =>
        server.close(() => {
          resolver();
        }),
      ),
  );
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${String(port)}`;
}

const fallas = (chequeos: Chequeo[]): string[] =>
  chequeos.filter((c) => !c.ok).map((c) => `${c.nombre} — ${c.detalle}`);

describe('staging: con app, sin indexar', () => {
  it('pasa todo', async () => {
    const baseUrl = await servir(staging);
    const chequeos = await smoke({ baseUrl, indexable: false, appUrl });
    expect(fallas(chequeos)).toEqual([]);
    expect(chequeos.length).toBeGreaterThanOrEqual(10);
  });

  it('si se espera que se indexe, falla en robots, sitemap y la meta', async () => {
    const baseUrl = await servir(staging);
    const f = fallas(await smoke({ baseUrl, indexable: true, siteUrl, appUrl }));
    // Cada uno por su cuenta y con su motivo (no basta con que el nombre mencione la palabra).
    expect(f.find((x) => x.startsWith('robots.txt permite todo'))).toMatch(/no dice "Allow: \/"/);
    expect(f.find((x) => x.startsWith('sitemap.xml lista'))).toMatch(/falta /);
    expect(f.find((x) => x.startsWith('se indexa'))).toMatch(/robots es "noindex,nofollow"/);
  });

  it('si se espera otra app, falla en "Entrar" y dice a dónde llevaba', async () => {
    const baseUrl = await servir(staging);
    const f = fallas(
      await smoke({ baseUrl, indexable: false, appUrl: 'https://otra.ejemplo.test' }),
    );
    expect(f).toHaveLength(1);
    expect(f[0]).toMatch(/Entrar/);
    expect(f[0]).toContain(`${appUrl}/login`);
  });
});

describe('producción: indexable, con canonical y sin el aviso de contacto', () => {
  it('pasa todo', async () => {
    const baseUrl = await servir(produccion);
    const chequeos = await smoke({ baseUrl, indexable: true, siteUrl, appUrl });
    expect(fallas(chequeos)).toEqual([]);
  });

  it('si se espera que no se indexe, falla en la meta, robots y sitemap', async () => {
    const baseUrl = await servir(produccion);
    const f = fallas(await smoke({ baseUrl, indexable: false, appUrl }));
    expect(f.length).toBeGreaterThanOrEqual(2);
    expect(f.some((x) => x.includes('robots.txt'))).toBe(true);
  });

  it('con otro sitio esperado, el canonical no coincide', async () => {
    const baseUrl = await servir(produccion);
    const f = fallas(
      await smoke({ baseUrl, indexable: true, siteUrl: 'https://otro.ejemplo.test', appUrl }),
    );
    expect(f.some((x) => x.includes('canonical') && x.includes(siteUrl))).toBe(true);
  });
});

describe('un build sin app', () => {
  it('pasa si no se espera app: ni "Entrar" ni un enlace al ingreso', async () => {
    const baseUrl = await servir(sinVariables);
    expect(fallas(await smoke({ baseUrl, indexable: false }))).toEqual([]);
  });

  it('falla si se espera una app: no hay "Entrar"', async () => {
    const baseUrl = await servir(sinVariables);
    const f = fallas(await smoke({ baseUrl, indexable: false, appUrl }));
    expect(f).toHaveLength(1);
    expect(f[0]).toMatch(/Entrar/);
  });
});

describe('lo que tiene que fallar', () => {
  it('un servidor sin headers de seguridad: dice cuáles faltan', async () => {
    const baseUrl = await servirSinHeaders(staging);
    const f = fallas(await smoke({ baseUrl, indexable: false, appUrl }));
    const headers = f.find((x) => x.includes('headers de seguridad')) ?? '';
    for (const nombre of [
      'content-security-policy',
      'strict-transport-security',
      'x-content-type-options',
      'referrer-policy',
    ]) {
      expect(headers, nombre).toContain(nombre);
    }
  });

  it('una CSP que deja correr scripts no alcanza: el smoke dice qué le falta', async () => {
    const baseUrl = await servirSinHeaders(staging, {
      'content-security-policy': "default-src 'self'; script-src 'self'",
      'strict-transport-security': 'max-age=31536000',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
    });
    const f = fallas(await smoke({ baseUrl, indexable: false, appUrl }));
    const headers = f.find((x) => x.includes('headers de seguridad')) ?? '';
    expect(headers).toContain("script-src 'none'");
    expect(headers).not.toContain('falta strict-transport-security');
  });

  it('el mismo servidor, que contesta 200 a todo: tampoco hay 404, redirección ni caché', async () => {
    const baseUrl = await servirSinHeaders(staging);
    const f = fallas(await smoke({ baseUrl, indexable: false, appUrl }));
    // El motivo, no sólo el nombre: lo que contestó de verdad.
    expect(f.find((x) => x.includes('responde 404'))).toMatch(/respondió 200/);
    expect(f.find((x) => x.startsWith('GET /privacidad (sin la barra)'))).toMatch(/respondió 200/);
    expect(f.find((x) => x.includes('assets con hash'))).toMatch(/\/_astro\//);
    expect(f.find((x) => x.startsWith('robots.txt bloquea todo'))).toMatch(
      /no dice "Disallow: \/"/,
    );
  });

  it('un HTML que dice noindex pero trae canonical: robots manda', async () => {
    // El index.html de producción con la meta cambiada: el canonical está, el robots no.
    const html = readFileSync(join(produccion, 'index.html'), 'utf8');
    const cambiado = html.replace('content="index,follow"', 'content="noindex,nofollow"');
    expect(cambiado).not.toBe(html);
    const server: Server = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/html' }).end(cambiado);
    });
    await new Promise<void>((resolver) => server.listen(0, '127.0.0.1', resolver));
    cierres.push(
      () =>
        new Promise<void>((resolver) =>
          server.close(() => {
            resolver();
          }),
        ),
    );
    const { port } = server.address() as AddressInfo;

    const f = fallas(
      await smoke({
        baseUrl: `http://127.0.0.1:${String(port)}`,
        indexable: true,
        siteUrl,
        appUrl,
      }),
    );
    expect(f.find((x) => x.startsWith('se indexa'))).toMatch(/robots es "noindex,nofollow"/);
  });

  it('/privacidad redirige, pero a otro lado: falla y dice a dónde', async () => {
    const server: Server = createServer((request, response) => {
      if (request.url === '/privacidad') {
        response.writeHead(301, { location: '/otra-cosa/' }).end();
      } else {
        response.writeHead(200, { 'content-type': 'text/html' }).end('<h1>x</h1>');
      }
    });
    await new Promise<void>((resolver) => server.listen(0, '127.0.0.1', resolver));
    cierres.push(
      () =>
        new Promise<void>((resolver) =>
          server.close(() => {
            resolver();
          }),
        ),
    );
    const { port } = server.address() as AddressInfo;

    const f = fallas(
      await smoke({ baseUrl: `http://127.0.0.1:${String(port)}`, indexable: false }),
    );
    expect(f.find((x) => x.startsWith('GET /privacidad (sin la barra)'))).toMatch(
      /redirige a "\/otra-cosa\/"/,
    );
  });

  it('producción sin quién responde: las páginas avisan y el smoke lo dice', async () => {
    // El build sin variables: las legales traen el aviso de contacto faltante.
    const baseUrl = await servir(sinVariables);
    const f = fallas(await smoke({ baseUrl, indexable: true, appUrl }));
    expect(f.some((x) => x.includes('quién responde') && x.includes('PUBLIC_CONTACT_NAME'))).toBe(
      true,
    );
  });

  it('una URL a la que no llega nadie: todo falla y no tira', async () => {
    const chequeos = await smoke({ baseUrl: 'http://127.0.0.1:9', indexable: false });
    expect(chequeos.length).toBeGreaterThanOrEqual(10);
    expect(chequeos.every((c) => !c.ok)).toBe(true);
    expect(chequeos.every((c) => c.detalle !== '')).toBe(true);
  });

  it('el www: pasa si redirige al sitio y falla si responde 200 o redirige a otro lado', async () => {
    const baseUrl = await servir(produccion);
    const redirige = (destino: string, estado = 301) =>
      new Promise<{ url: string; cerrar: () => Promise<void> }>((resolver) => {
        const server = createServer((_request, response) => {
          response.writeHead(estado, { location: destino }).end();
        });
        server.listen(0, '127.0.0.1', () => {
          const { port } = server.address() as AddressInfo;
          resolver({
            url: `http://127.0.0.1:${String(port)}`,
            cerrar: () =>
              new Promise<void>((r) =>
                server.close(() => {
                  r();
                }),
              ),
          });
        });
      });

    const bien = await redirige(`${siteUrl}/`);
    const mal = await redirige('https://otro.ejemplo.test/');
    const sinRedireccion = await redirige(`${siteUrl}/`, 200);
    cierres.push(bien.cerrar, mal.cerrar, sinRedireccion.cerrar);

    const con = (redirigeDesde: string) =>
      smoke({ baseUrl, indexable: true, siteUrl, appUrl, redirigeDesde });
    expect(fallas(await con(bien.url))).toEqual([]);
    expect(fallas(await con(mal.url)).join('\n')).toMatch(/www|redirig/);
    expect(fallas(await con(sinRedireccion.url)).join('\n')).toMatch(/www|redirig/);
  });
});

describe('con un fetch que contesta lo mínimo', () => {
  const bytes = (texto: string) => new TextEncoder().encode(texto);

  /** Respuestas sin un solo header: lo que contestaría un servidor que no configuró nada. */
  const sinHeaders: typeof fetch = (entrada) => {
    const url = new URL(entrada instanceof Request ? entrada.url : entrada);
    const cuerpos: Record<string, [number, string]> = {
      '/health': [200, '{"status":"ok"}'],
      '/': [200, '<h1>Hola</h1><link rel="stylesheet" href="/_astro/x.css">'],
      '/robots.txt': [200, 'nada'],
      '/sitemap.xml': [200, '<urlset></urlset>'],
      '/privacidad/': [200, '<h1>P</h1>'],
      '/terminos/': [200, '<h1>T</h1>'],
      '/privacidad': [301, ''],
      '/_astro/x.css': [200, 'body{}'],
    };
    if (url.hostname === 'www.ejemplo.test') {
      return Promise.resolve(new Response(null, { status: 302 }));
    }
    const [estado, cuerpo] = cuerpos[url.pathname] ?? [404, 'otra cosa'];
    return Promise.resolve(new Response(bytes(cuerpo), { status: estado }));
  };

  it('sin content-type, sin cache-control y sin Location: dice "" y no se cae', async () => {
    const chequeos = await smoke({
      baseUrl: 'https://ejemplo.test',
      indexable: false,
      redirigeDesde: 'https://www.ejemplo.test/',
      fetch: sinHeaders,
    });
    const detalle = (nombre: RegExp) => chequeos.find((c) => nombre.test(c.nombre))?.detalle;
    expect(detalle(/^GET \/ responde/)).toBe('el content-type es ""');
    expect(detalle(/assets con hash/)).toBe('/_astro/x.css tiene cache-control ""');
    expect(detalle(/sin la barra/)).toBe('redirige a ""');
    expect(detalle(/^www:/)).toMatch(/redirige a "" y se esperaba el origen/);
    expect(detalle(/ruta que no existe/)).toBe('no es la página de la marca');
    expect(detalle(/^no se indexa/)).toMatch(/robots es "undefined"/);
  });

  it('un fetch que rechaza con algo que no es un Error: lo dice igual', async () => {
    const chequeos = await smoke({
      baseUrl: 'https://ejemplo.test',
      indexable: false,
      // Rechazar con algo que no es un Error es justo lo que se prueba.
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      fetch: () => Promise.reject('boom'),
    });
    expect(chequeos.every((c) => !c.ok && c.detalle.includes('boom'))).toBe(true);
  });

  it('un Error sin causa: sólo el mensaje', async () => {
    const chequeos = await smoke({
      baseUrl: 'https://ejemplo.test',
      indexable: false,
      fetch: () => Promise.reject(new Error('sin red')),
    });
    expect(chequeos[0]?.detalle).toBe('no se pudo pedir: sin red');
  });
});

describe('formatearSmoke()', () => {
  const chequeos: Chequeo[] = [
    { nombre: 'GET /health', ok: true, detalle: '' },
    { nombre: 'headers', ok: false, detalle: 'falta content-security-policy' },
  ];

  it('una línea por chequeo, con la marca y el motivo de lo que falló, y el total', () => {
    const texto = formatearSmoke(chequeos);
    expect(texto).toContain('✓ GET /health');
    expect(texto).toContain('✗ headers — falta content-security-policy');
    expect(texto).toMatch(/1 de 2/);
  });

  it('todo en verde, lo dice', () => {
    expect(formatearSmoke(chequeos.slice(0, 1))).toMatch(/1 de 1/);
  });
});
