/*
 * El smoke de la landing (F10-13, spec §5.7 y §13): lo que una persona comprobaría con `curl` después
 * de un deploy, como código, contra **cualquier URL** —staging, producción o un servidor local—. Es
 * de sólo lectura: sólo hace GET, no manda nada y no necesita credenciales.
 *
 * Qué mira: que responda, los headers de seguridad de F10-11, si se indexa o no (`robots`, canonical,
 * `robots.txt` y sitemap), que las páginas legales estén y tengan quién responde, que "Entrar" lleve
 * a la app (o que no esté, si no hay app), la 404 de la marca y la caché de los assets con hash.
 *
 * Es el que F3-12 puede llamar después de cada deploy a staging, y el que se corre a mano contra
 * producción la primera vez (`pnpm --filter @wasabi-cross/landing smoke …`).
 */

export interface Chequeo {
  nombre: string;
  ok: boolean;
  /** Qué falló, o cómo se vio lo que pasó. Vacío si no hace falta. */
  detalle: string;
}

export interface OpcionesSmoke {
  /** Adónde se pregunta: `https://staging.…` o `http://127.0.0.1:3000`. */
  baseUrl: string;
  /** Producción: tiene que ser indexable, con canonical y sitemap. Staging: `noindex`. */
  indexable: boolean;
  /** El origen público que tiene que decir el canonical y el sitemap. Por defecto, `baseUrl`. */
  siteUrl?: string | undefined;
  /** A dónde tiene que llevar "Entrar". Sin esto, se espera que la landing no tenga el botón. */
  appUrl?: string | undefined;
  /** Una URL (el `www`) que tiene que redirigir al sitio. */
  redirigeDesde?: string | undefined;
  /** Para los tests. Por defecto, el `fetch` de Node. */
  fetch?: typeof fetch;
}

/** Los headers de F10-11 que no pueden faltar, con lo que tienen que contener. */
const HEADERS = [
  { nombre: 'content-security-policy', debeContener: ["default-src 'self'", "script-src 'none'"] },
  { nombre: 'strict-transport-security', debeContener: ['max-age='] },
  { nombre: 'x-content-type-options', debeContener: ['nosniff'] },
  { nombre: 'referrer-policy', debeContener: ['no-referrer'] },
] as const;

const PAGINAS_LEGALES = ['/privacidad/', '/terminos/'] as const;

/** Lo que dice una página legal cuando el build no trae quién responde (src/content/legal.ts). */
const AVISO_SIN_CONTACTO = 'antes de publicar el sitio';

const REDIRECCIONES = new Set([301, 302, 307, 308]);

interface Respuesta {
  status: number;
  headers: Headers;
  texto: string;
}

/** Un chequeo devuelve `null` si pasa, o el motivo por el que falla. */
type Comprobacion = () => Promise<string | null>;

export async function smoke(opciones: OpcionesSmoke): Promise<Chequeo[]> {
  const base = new URL(opciones.baseUrl);
  const sitio = new URL(opciones.siteUrl ?? opciones.baseUrl).origin;
  const pedir = opciones.fetch ?? fetch;
  const www = opciones.redirigeDesde;

  async function get(ruta: string): Promise<Respuesta> {
    const respuesta = await pedir(new URL(ruta, base), {
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    });
    return {
      status: respuesta.status,
      headers: respuesta.headers,
      texto: await respuesta.text(),
    };
  }

  const comprobaciones: [string, Comprobacion][] = [
    [
      'GET /health responde 200 {"status":"ok"}',
      async () => {
        const r = await get('/health');
        if (r.status !== 200) return `respondió ${String(r.status)}`;
        return r.texto.includes('"status":"ok"') ? null : `el cuerpo es ${r.texto.slice(0, 80)}`;
      },
    ],
    [
      'GET / responde 200 con HTML',
      async () => {
        const r = await get('/');
        if (r.status !== 200) return `respondió ${String(r.status)}`;
        const tipo = r.headers.get('content-type') ?? '';
        if (!tipo.includes('text/html')) return `el content-type es "${tipo}"`;
        return /<h1\b/.test(r.texto) ? null : 'la página no tiene un <h1>';
      },
    ],
    [
      'headers de seguridad en /',
      async () => {
        const { headers } = await get('/');
        const problemas = HEADERS.flatMap(({ nombre, debeContener }) => {
          const valor = headers.get(nombre);
          if (valor === null) return [`falta ${nombre}`];
          const sinEso = debeContener.filter((parte) => !valor.includes(parte));
          return sinEso.length === 0
            ? []
            : [`${nombre} no contiene ${sinEso.map((p) => `"${p}"`).join(', ')} (es "${valor}")`];
        });
        return problemas.length === 0 ? null : problemas.join('; ');
      },
    ],
    [
      opciones.indexable
        ? 'se indexa: robots index,follow y canonical al sitio'
        : 'no se indexa: robots noindex,nofollow y sin canonical',
      async () => {
        const { texto } = await get('/');
        const robots = /<meta\s+name="robots"\s+content="([^"]*)"/.exec(texto)?.[1];
        const canonical = /<link\s+rel="canonical"\s+href="([^"]*)"/.exec(texto)?.[1];
        if (opciones.indexable) {
          if (robots !== 'index,follow')
            return `robots es "${String(robots)}" y se esperaba index,follow`;
          if (canonical === undefined) return 'no tiene canonical';
          const origen = new URL(canonical).origin;
          return origen === sitio ? null : `el canonical es ${canonical} y se esperaba ${sitio}`;
        }
        if (robots !== 'noindex,nofollow') {
          return `robots es "${String(robots)}" y se esperaba noindex,nofollow`;
        }
        return canonical === undefined ? null : `tiene canonical (${canonical}) y no se indexa`;
      },
    ],
    [
      opciones.indexable
        ? 'robots.txt permite todo y apunta al sitemap'
        : 'robots.txt bloquea todo',
      async () => {
        const r = await get('/robots.txt');
        if (r.status !== 200) return `respondió ${String(r.status)}`;
        if (opciones.indexable) {
          if (!r.texto.includes('Allow: /')) return 'no dice "Allow: /"';
          const sitemap = `Sitemap: ${sitio}/sitemap.xml`;
          return r.texto.includes(sitemap) ? null : `no trae "${sitemap}"`;
        }
        if (!r.texto.includes('Disallow: /')) return 'no dice "Disallow: /"';
        return r.texto.includes('Sitemap:') ? 'apunta a un sitemap y no se indexa' : null;
      },
    ],
    [
      opciones.indexable
        ? 'sitemap.xml lista la home y las páginas legales'
        : 'sitemap.xml está vacío',
      async () => {
        const r = await get('/sitemap.xml');
        if (r.status !== 200) return `respondió ${String(r.status)}`;
        const locs = [...r.texto.matchAll(/<loc>([^<]*)<\/loc>/g)].flatMap((m) => m.slice(1, 2));
        if (!opciones.indexable) {
          return locs.length === 0 ? null : `lista ${String(locs.length)} URL y no se indexa`;
        }
        const esperadas = ['/', ...PAGINAS_LEGALES].map((ruta) => `${sitio}${ruta}`);
        const faltan = esperadas.filter((url) => !locs.includes(url));
        return faltan.length === 0 ? null : `falta ${faltan.join(', ')}`;
      },
    ],
    ...PAGINAS_LEGALES.map((ruta): [string, Comprobacion] => [
      `GET ${ruta} responde 200 con su título`,
      async () => {
        const r = await get(ruta);
        if (r.status !== 200) return `respondió ${String(r.status)}`;
        return /<h1\b/.test(r.texto) ? null : 'la página no tiene un <h1>';
      },
    ]),
    [
      'GET /privacidad (sin la barra) redirige a /privacidad/',
      async () => {
        const r = await get('/privacidad');
        if (!REDIRECCIONES.has(r.status)) return `respondió ${String(r.status)}`;
        const destino = r.headers.get('location') ?? '';
        return destino.endsWith('/privacidad/') ? null : `redirige a "${destino}"`;
      },
    ],
    ...(opciones.indexable
      ? [
          [
            'las páginas legales dicen quién responde (sin el aviso de contacto faltante)',
            async () => {
              for (const ruta of PAGINAS_LEGALES) {
                const { texto } = await get(ruta);
                if (texto.includes(AVISO_SIN_CONTACTO)) {
                  return `${ruta} avisa que falta el contacto: faltan PUBLIC_CONTACT_NAME y PUBLIC_CONTACT_EMAIL`;
                }
                if (!texto.includes('href="mailto:')) return `${ruta} no tiene un enlace mailto`;
              }
              return null;
            },
          ] satisfies [string, Comprobacion],
        ]
      : []),
    [
      opciones.appUrl === undefined
        ? 'sin app: no hay "Entrar" ni enlace al ingreso'
        : `"Entrar" lleva a ${new URL('/login', opciones.appUrl).href}`,
      async () => {
        const { texto } = await get('/');
        const alIngreso = [...texto.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)]
          .flatMap((m) => m.slice(1, 2))
          .filter((href) => href.includes('/login'));
        if (opciones.appUrl === undefined) {
          if (alIngreso.length > 0)
            return `hay enlaces al ingreso: ${[...new Set(alIngreso)].join(', ')}`;
          return /Entrar|Empezar gratis/.test(texto) ? 'aparece "Entrar" o "Empezar gratis"' : null;
        }
        const esperado = new URL('/login', opciones.appUrl).href;
        if (alIngreso.length === 0) return `no hay "Entrar": se esperaba un enlace a ${esperado}`;
        const otros = [...new Set(alIngreso)].filter((href) => href !== esperado);
        return otros.length === 0
          ? null
          : `"Entrar" lleva a ${otros.join(', ')} y se esperaba ${esperado}`;
      },
    ],
    [
      'GET de una ruta que no existe responde 404 con la página de la marca',
      async () => {
        const r = await get('/esta-pagina-no-existe-smoke');
        if (r.status !== 404) return `respondió ${String(r.status)}`;
        return r.texto.includes('Esa página no existe') ? null : 'no es la página de la marca';
      },
    ],
    [
      'los assets con hash se cachean un año (immutable)',
      async () => {
        const { texto } = await get('/');
        const css = /<link\b[^>]*\bhref="(\/_astro\/[^"]+\.css)"/.exec(texto)?.[1];
        if (css === undefined) return 'la página no enlaza ningún CSS de /_astro/';
        const r = await get(css);
        if (r.status !== 200) return `${css} respondió ${String(r.status)}`;
        const cache = r.headers.get('cache-control') ?? '';
        return cache.includes('immutable') ? null : `${css} tiene cache-control "${cache}"`;
      },
    ],
    ...(www === undefined
      ? []
      : [
          [
            `www: ${www} redirige al sitio (${sitio})`,
            async () => {
              const respuesta = await pedir(new URL(www), {
                redirect: 'manual',
                signal: AbortSignal.timeout(15_000),
              });
              if (!REDIRECCIONES.has(respuesta.status)) {
                return `no redirige: respondió ${String(respuesta.status)}`;
              }
              const destino = respuesta.headers.get('location') ?? '';
              const destinoOrigen = destino === '' ? '' : new URL(destino, www).origin;
              return destinoOrigen === sitio
                ? null
                : `redirige a "${destino}" y se esperaba el origen ${sitio}`;
            },
          ] satisfies [string, Comprobacion],
        ]),
  ];

  const resultados: Chequeo[] = [];
  for (const [nombre, comprobar] of comprobaciones) {
    try {
      const problema = await comprobar();
      resultados.push({ nombre, ok: problema === null, detalle: problema ?? '' });
    } catch (error) {
      // Sin red, un host que no resuelve o un timeout: es un fallo del chequeo, no una excepción.
      const motivo = error instanceof Error ? error.message : String(error);
      const causa =
        error instanceof Error && error.cause instanceof Error ? error.cause.message : '';
      resultados.push({
        nombre,
        ok: false,
        detalle: `no se pudo pedir: ${motivo}${causa === '' ? '' : ` (${causa})`}`,
      });
    }
  }
  return resultados;
}

/** El reporte para la terminal: una línea por chequeo, con el motivo de lo que falló, y el total. */
export function formatearSmoke(chequeos: readonly Chequeo[]): string {
  const lineas = chequeos.map((c) =>
    c.ok ? `✓ ${c.nombre}` : `✗ ${c.nombre}${c.detalle === '' ? '' : ` — ${c.detalle}`}`,
  );
  const pasaron = chequeos.filter((c) => c.ok).length;
  return `${lineas.join('\n')}\n\n${String(pasaron)} de ${String(chequeos.length)} chequeos pasaron.`;
}
