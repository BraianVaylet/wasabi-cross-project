import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/*
 * Las ayudas del E2E de la landing (F10-10). Cada una mira una sola cosa del navegador y la
 * devuelve como datos: así los specs afirman sobre ellos, y `ayudas.spec.ts` prueba al revés que
 * detectan lo que dicen detectar (una imagen que falta, un peso que se pasa).
 */

export const ANCHOS = [
  { nombre: '390', width: 390, height: 844 },
  { nombre: '1280', width: 1280, height: 800 },
] as const;

/**
 * Baja la página de a poco para que carguen las capturas `lazy`, y vuelve arriba. Sin esto, las que
 * están bajo el pliegue no se piden y "ninguna imagen rota" pasa en falso.
 *
 * `behavior: 'instant'`: `global.css` pone `scroll-behavior: smooth`, y un salto animado se pisa con
 * el siguiente antes de llegar.
 */
export async function cargarTodo(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const espera = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));
    const paso = Math.max(200, Math.floor(window.innerHeight / 2));
    for (let y = 0; y < document.documentElement.scrollHeight; y += paso) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await espera(100);
    }
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    await espera(150);
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForLoadState('networkidle');
}

/** Sin violaciones WCAG 2.2 AA en lo que está abierto (spec §11), con el nodo y el motivo de cada una. */
export async function auditar(page: Page, pantalla: string): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  const detalle = violations.flatMap((violation) =>
    violation.nodes.map(
      (node) =>
        `${violation.id} en ${node.target.join(' ')} — ${node.failureSummary ?? violation.help}`,
    ),
  );
  expect(detalle, `Violaciones de accesibilidad en ${pantalla}`).toEqual([]);
}

export interface ImagenRota {
  src: string;
  alt: string;
  motivo: string;
}

/**
 * Las imágenes que no se ven: no terminaron de cargar o el navegador no las pudo decodificar
 * (`naturalWidth` 0). El PNG del diseño de la landing salió con las once rotas y nadie lo vio.
 */
export async function imagenesRotas(page: Page): Promise<ImagenRota[]> {
  return page.evaluate(() =>
    [...document.images].flatMap((img) => {
      const src = img.currentSrc || img.src;
      if (!img.complete) return [{ src, alt: img.alt, motivo: 'no terminó de cargar' }];
      if (img.naturalWidth === 0) {
        return [{ src, alt: img.alt, motivo: 'no se pudo cargar o decodificar (naturalWidth 0)' }];
      }
      return [];
    }),
  );
}

/** Cada imagen rota con su `src`, su `alt` y el motivo: para que el fallo diga cuál es. */
export function describirRotas(rotas: readonly ImagenRota[]): string {
  return rotas.map((r) => `- ${r.src} (alt: "${r.alt}") — ${r.motivo}`).join('\n');
}

export async function contarImagenes(page: Page): Promise<number> {
  return page.evaluate(() => document.images.length);
}

/**
 * Lo que el navegador se queja mientras la página carga: errores y avisos de consola (la CSP
 * escribe ahí lo que bloquea), errores de la página, pedidos fallidos y respuestas 4xx/5xx. Se
 * llama antes de navegar; devuelve la función que dice lo juntado.
 */
export function vigilar(page: Page): () => string[] {
  const problemas: string[] = [];
  page.on('console', (mensaje) => {
    if (mensaje.type() === 'error' || mensaje.type() === 'warning') {
      problemas.push(`consola (${mensaje.type()}): ${mensaje.text()}`);
    }
  });
  page.on('pageerror', (error) => problemas.push(`error de la página: ${error.message}`));
  page.on('requestfailed', (pedido) => problemas.push(`pedido fallido: ${pedido.url()}`));
  page.on('response', (respuesta) => {
    if (respuesta.status() >= 400) {
      problemas.push(`HTTP ${String(respuesta.status())}: ${respuesta.url()}`);
    }
  });
  return () => problemas;
}

/** `true` si la página se desplaza de costado: algo se salió del ancho. */
export async function hayScrollHorizontal(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

/** Los enlaces `#algo` que no tienen a dónde ir. */
export async function anclasColgando(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')]
      .map((a) => a.getAttribute('href') ?? '')
      .filter((href) => href.length > 1 && document.getElementById(href.slice(1)) === null),
  );
}

export interface Parada {
  /** El nombre accesible, o el texto, de lo que tiene el foco. */
  nombre: string;
  tag: string;
  rol: string | null;
  href: string | null;
  /** Cómo se ve el foco: el `outline`, una `sombra` interior, o `ninguno`. */
  foco: 'outline' | 'sombra' | 'ninguno';
  /** Si está, al menos en parte, dentro de lo que se ve. */
  visible: boolean;
}

/**
 * El recorrido por teclado: aprieta Tab y anota qué recibe el foco, y cómo se ve. Termina cuando el
 * foco vuelve a salir de la página, o a los `max` pasos.
 */
export async function recorrerConTab(page: Page, max = 60): Promise<Parada[]> {
  await page.evaluate(() => {
    // Desde el principio de la página, como quien la acaba de abrir.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo({ top: 0, behavior: 'instant' });
  });

  const paradas: Parada[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const parada = await page.evaluate(async (): Promise<Parada | null> => {
      // El foco desplaza la página con `scroll-behavior: smooth`: se espera a que termine de
      // moverse, o se mediría un elemento que todavía no llegó a la vista.
      await new Promise<void>((resolver) => {
        let anterior = -1;
        let quietos = 0;
        let cuadros = 0;
        const medir = () => {
          cuadros++;
          if (window.scrollY === anterior) quietos++;
          else {
            quietos = 0;
            anterior = window.scrollY;
          }
          if (quietos >= 3 || cuadros > 90) resolver();
          else requestAnimationFrame(medir);
        };
        requestAnimationFrame(medir);
      });

      const el = document.activeElement;
      if (el === null || el === document.body || el === document.documentElement) return null;
      const estilo = getComputedStyle(el);
      const caja = el.getBoundingClientRect();
      // El nombre sin lo decorativo: la flecha de un CTA es `aria-hidden` y no es parte de su nombre.
      const copia = el.cloneNode(true);
      if (copia instanceof Element) {
        copia.querySelectorAll('[aria-hidden="true"]').forEach((n) => {
          n.remove();
        });
      }
      const nombre = (el.getAttribute('aria-label') ?? copia.textContent ?? '').replace(
        /\s+/g,
        ' ',
      );
      const outline = estilo.outlineStyle !== 'none' && parseFloat(estilo.outlineWidth) > 0;
      return {
        nombre: nombre.trim().slice(0, 80),
        tag: el.tagName.toLowerCase(),
        rol: el.getAttribute('role'),
        href: el.getAttribute('href'),
        foco: outline ? 'outline' : estilo.boxShadow !== 'none' ? 'sombra' : 'ninguno',
        visible:
          caja.width > 0 &&
          caja.height > 0 &&
          caja.bottom > 0 &&
          caja.top < window.innerHeight &&
          caja.right > 0 &&
          caja.left < window.innerWidth,
      };
    });
    if (parada === null) break;
    paradas.push(parada);
  }
  return paradas;
}

/** `true` si `esperado` aparece en `real`, en ese orden (pueden haber otros en el medio). */
export function esSubsecuencia(esperado: readonly string[], real: readonly string[]): boolean {
  let siguiente = 0;
  for (const item of real) {
    if (item === esperado[siguiente]) siguiente++;
  }
  return siguiente === esperado.length;
}

/* ------------------------------------------------------------------------------------------ */

export interface Peso {
  /** Lo que se transfirió, en bytes (cuerpo de las respuestas). */
  total: number;
  archivos: { url: string; bytes: number }[];
}

/**
 * Cuenta lo que baja la página. Se llama antes de navegar; devuelve la función que dice lo
 * acumulado hasta ese momento (se puede pedir más de una vez: primera vista y página entera).
 */
export function registrarPeso(page: Page): () => Promise<Peso> {
  const pendientes: Promise<{ url: string; bytes: number }>[] = [];
  page.on('response', (respuesta) => {
    const url = respuesta.url();
    pendientes.push(
      (async () => {
        await respuesta.finished();
        const { responseBodySize } = await respuesta.request().sizes();
        return { url, bytes: responseBodySize };
      })().catch(() => ({ url, bytes: 0 })),
    );
  });
  return async () => {
    const archivos = await Promise.all(pendientes);
    return { total: archivos.reduce((suma, a) => suma + a.bytes, 0), archivos };
  };
}

export interface Presupuesto {
  primeraVista: number;
  paginaEntera: number;
}

const NOMBRES: Record<keyof Presupuesto, string> = {
  primeraVista: 'la primera vista',
  paginaEntera: 'la página entera',
};

export const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;

/** Qué se pasó del presupuesto, con las medidas: vacío si entra. */
export function evaluarPresupuesto(medido: Presupuesto, limite: Presupuesto): string[] {
  return (Object.keys(NOMBRES) as (keyof Presupuesto)[]).flatMap((clave) =>
    medido[clave] > limite[clave]
      ? [
          `${NOMBRES[clave]} pesa ${kb(medido[clave])} y el presupuesto es ${kb(limite[clave])} ` +
            `(${kb(medido[clave] - limite[clave])} de más)`,
        ]
      : [],
  );
}

/** El peso por tipo de archivo, de mayor a menor: lo que hace falta para saber qué recortar. */
export function resumirPeso(peso: Peso): string {
  const porTipo = new Map<string, number>();
  for (const { url, bytes } of peso.archivos) {
    const ruta = new URL(url).pathname;
    const extension = /\.([a-z0-9]+)$/i.exec(ruta)?.[1]?.toLowerCase() ?? 'html';
    porTipo.set(extension, (porTipo.get(extension) ?? 0) + bytes);
  }
  return [...porTipo.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, bytes]) => `${tipo}: ${kb(bytes)}`)
    .join(' · ');
}
