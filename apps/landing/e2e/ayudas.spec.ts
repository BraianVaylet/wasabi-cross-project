import { expect, test } from '@playwright/test';
import {
  describirRotas,
  esSubsecuencia,
  evaluarPresupuesto,
  imagenesRotas,
  kb,
  recorrerConTab,
  resumirPeso,
} from './ayudas.ts';

/*
 * Las pruebas inversas del E2E (F10-10): que lo que mira lo que dice mirar, y que **falla** y dice
 * cuál cuando corresponde. Un E2E que nunca puede fallar no prueba nada. Sin tocar el build: se arma
 * la rotura a mano, en una página en blanco.
 */

// Un PNG válido de 1×1, para el caso que no tiene que fallar.
const PNG_VALIDO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test.describe('imagenesRotas()', () => {
  test('una captura que falta (404) se detecta, y el mensaje dice cuál es', async ({ page }) => {
    await page.route('**/capturas/falta.webp', (ruta) => ruta.fulfill({ status: 404 }));
    await page.setContent(
      '<img src="http://ejemplo.test/capturas/falta.webp" alt="Catálogo con la búsqueda">',
    );
    await page.waitForLoadState('load');

    const rotas = await imagenesRotas(page);
    expect(rotas).toHaveLength(1);
    expect(rotas[0]?.src).toContain('capturas/falta.webp');
    const mensaje = describirRotas(rotas);
    expect(mensaje).toContain('capturas/falta.webp');
    expect(mensaje).toContain('Catálogo con la búsqueda');
  });

  test('un PNG corrupto se detecta: llega con 200 y no se puede decodificar', async ({ page }) => {
    await page.route('**/capturas/corrupta.png', (ruta) =>
      ruta.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from('esto no es un png'),
      }),
    );
    await page.setContent(
      '<img src="http://ejemplo.test/capturas/corrupta.png" alt="Detalle del ejercicio">',
    );
    await page.waitForLoadState('load');

    const rotas = await imagenesRotas(page);
    expect(rotas).toHaveLength(1);
    expect(rotas[0]?.src).toContain('capturas/corrupta.png');
    expect(rotas[0]?.motivo).toContain('naturalWidth 0');
  });

  test('una imagen sana no se marca (control: sin esto, "detecta todo" pasaría igual)', async ({
    page,
  }) => {
    await page.route('**/capturas/sana.png', (ruta) =>
      ruta.fulfill({ status: 200, contentType: 'image/png', body: PNG_VALIDO }),
    );
    await page.setContent('<img src="http://ejemplo.test/capturas/sana.png" alt="Una captura">');
    await page.waitForLoadState('load');
    await expect.poll(() => imagenesRotas(page)).toEqual([]);
  });
});

test.describe('evaluarPresupuesto()', () => {
  const limite = { primeraVista: 200 * 1024, paginaEntera: 500 * 1024 };

  test('dentro del presupuesto no dice nada', () => {
    expect(
      evaluarPresupuesto({ primeraVista: 199 * 1024, paginaEntera: 500 * 1024 }, limite),
    ).toEqual([]);
  });

  test('pasado, dice qué se pasó, cuánto pesa, el tope y la diferencia', () => {
    const fallas = evaluarPresupuesto(
      { primeraVista: 230 * 1024, paginaEntera: 480 * 1024 },
      limite,
    );
    expect(fallas).toHaveLength(1);
    expect(fallas[0]).toContain('la primera vista');
    expect(fallas[0]).toContain('230.0 KB');
    expect(fallas[0]).toContain('200.0 KB');
    expect(fallas[0]).toContain('30.0 KB de más');
  });

  test('las dos medidas pasadas son dos fallas', () => {
    expect(
      evaluarPresupuesto({ primeraVista: 300 * 1024, paginaEntera: 900 * 1024 }, limite),
    ).toHaveLength(2);
  });

  test('un byte de más ya es una falla', () => {
    expect(
      evaluarPresupuesto({ primeraVista: limite.primeraVista + 1, paginaEntera: 0 }, limite),
    ).toHaveLength(1);
  });
});

test.describe('lo demás', () => {
  test('resumirPeso() agrupa por tipo, de mayor a menor', () => {
    const resumen = resumirPeso({
      total: 0,
      archivos: [
        { url: 'http://x.test/', bytes: 2048 },
        { url: 'http://x.test/_astro/a.webp', bytes: 10 * 1024 },
        { url: 'http://x.test/_astro/b.webp', bytes: 5 * 1024 },
        { url: 'http://x.test/_astro/f.woff2', bytes: 4096 },
      ],
    });
    expect(resumen).toBe('webp: 15.0 KB · woff2: 4.0 KB · html: 2.0 KB');
    expect(kb(1536)).toBe('1.5 KB');
  });

  test('esSubsecuencia() respeta el orden', () => {
    expect(esSubsecuencia(['a', 'c'], ['a', 'b', 'c'])).toBe(true);
    expect(esSubsecuencia(['c', 'a'], ['a', 'b', 'c'])).toBe(false);
    expect(esSubsecuencia(['a', 'd'], ['a', 'b', 'c'])).toBe(false);
  });

  test('recorrerConTab() marca el foco que no se ve (un control sin indicador)', async ({
    page,
  }) => {
    await page.setContent(
      '<style>a:focus, button:focus { outline: none; box-shadow: none; }</style>' +
        '<a href="#x">Sin foco visible</a>',
    );
    const paradas = await recorrerConTab(page, 3);
    expect(paradas).toHaveLength(1);
    expect(paradas[0]?.nombre).toBe('Sin foco visible');
    expect(paradas[0]?.foco).toBe('ninguno');
  });

  test('recorrerConTab() ve el foco con outline y con sombra interior', async ({ page }) => {
    await page.setContent(
      '<style>.a:focus { outline: 2px solid red; } .b:focus { outline: none; box-shadow: inset 0 0 0 3px blue; }</style>' +
        '<a class="a" href="#x">Con outline</a><a class="b" href="#y">Con sombra</a>',
    );
    const paradas = await recorrerConTab(page, 5);
    expect(paradas.map((p) => [p.nombre, p.foco])).toEqual([
      ['Con outline', 'outline'],
      ['Con sombra', 'sombra'],
    ]);
  });
});
