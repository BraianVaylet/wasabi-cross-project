import { expect, test } from '@playwright/test';
import {
  ANCHOS,
  anclasColgando,
  auditar,
  cargarTodo,
  contarImagenes,
  describirRotas,
  esSubsecuencia,
  hayScrollHorizontal,
  imagenesRotas,
  recorrerConTab,
  vigilar,
} from './ayudas.ts';
import { APP_URL, CONTACTO } from './entorno.ts';

/*
 * El E2E de la landing con app (F10-10, spec §5.7, §11 y §13): lo que sólo se ve en un navegador de
 * verdad, sobre el build que sirve el servidor de producción, a 390 y a 1280 px.
 */

const PAGINAS = [
  { ruta: '/', nombre: 'inicio' },
  { ruta: '/privacidad/', nombre: 'privacidad' },
  { ruta: '/terminos/', nombre: 'términos' },
] as const;

/** Las capturas del home: hero, Registro (2), Funciones (2), Estadísticas (6) y Planes (2). */
const CAPTURAS_DEL_HOME = 13;

for (const ancho of ANCHOS) {
  test.describe(`a ${ancho.nombre}px`, () => {
    test.use({ viewport: { width: ancho.width, height: ancho.height } });

    for (const { ruta, nombre } of PAGINAS) {
      test(`${nombre}: sin violaciones de axe (WCAG 2.2 AA)`, async ({ page }) => {
        await page.goto(ruta);
        await cargarTodo(page);
        await auditar(page, `${nombre} a ${ancho.nombre}px`);
      });

      test(`${nombre}: la consola sin errores, avisos ni quejas de la CSP, y todo carga`, async ({
        page,
      }) => {
        const problemas = vigilar(page);
        await page.goto(ruta);
        await cargarTodo(page);
        expect(problemas()).toEqual([]);
      });

      test(`${nombre}: sin scroll horizontal`, async ({ page }) => {
        await page.goto(ruta);
        await cargarTodo(page);
        expect(await hayScrollHorizontal(page)).toBe(false);
      });
    }

    test('la 404 con la marca: responde 404, sin violaciones y sin scroll horizontal', async ({
      page,
    }) => {
      const respuesta = await page.goto('/esta-pagina-no-existe');
      expect(respuesta?.status()).toBe(404);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Esa página no existe');
      await auditar(page, `404 a ${ancho.nombre}px`);
      expect(await hayScrollHorizontal(page)).toBe(false);
    });

    test('ninguna imagen rota: todas cargan y se decodifican', async ({ page }) => {
      await page.goto('/');
      await cargarTodo(page);
      // Que haya imágenes: sin esto, "ninguna rota" pasa en falso si la página las pierde.
      expect(await contarImagenes(page)).toBeGreaterThanOrEqual(CAPTURAS_DEL_HOME);
      const rotas = await imagenesRotas(page);
      expect(rotas, `Imágenes rotas:\n${describirRotas(rotas)}`).toEqual([]);
    });

    test('todas las anclas de la página tienen su destino', async ({ page }) => {
      await page.goto('/');
      expect(await anclasColgando(page)).toEqual([]);
      for (const id of ['registro', 'funciones', 'estadisticas', 'planes', 'demo']) {
        await expect(page.locator(`#${id}`), `falta #${id}`).toHaveCount(1);
      }
    });

    test('el foco recorre la página por teclado y siempre se ve', async ({ page }) => {
      await page.goto('/');
      const paradas = await recorrerConTab(page);

      // Empieza por el enlace para saltar al contenido.
      expect(paradas[0]?.nombre).toBe('Saltar al contenido');

      // Todo lo que recibe el foco se ve en pantalla y tiene indicador de foco.
      const sinFoco = paradas.filter((p) => p.foco === 'ninguno' || !p.visible);
      expect(
        sinFoco,
        `Sin foco visible: ${sinFoco.map((p) => `${p.tag} "${p.nombre}"`).join(', ')}`,
      ).toEqual([]);

      // El orden del diseño: salto → (nav, desde 768px) → Entrar → CTA → demo → tabla → footer.
      const nombres = paradas.map((p) => (p.rol === 'region' ? '<tabla>' : p.nombre));
      const esperado = [
        'Saltar al contenido',
        ...(ancho.width >= 768 ? ['Registro', 'Funciones', 'Free / PRO'] : []),
        'Entrar',
        'Empezar gratis',
        'Ver la app en acción',
        '<tabla>',
        'Privacidad',
        'Términos',
      ];
      expect(
        esSubsecuencia(esperado, nombres),
        `Orden del foco inesperado.\nEsperado (en ese orden): ${esperado.join(' → ')}\nReal: ${nombres.join(' → ')}`,
      ).toBe(true);
    });

    test('"Entrar" y "Empezar gratis" van al /login de la app, y a ninguna otra parte', async ({
      page,
    }) => {
      await page.goto('/');
      const hrefs = await page
        .getByRole('link', { name: /^(Entrar|Empezar gratis)/ })
        .evaluateAll((enlaces) => enlaces.map((a) => a.getAttribute('href')));
      expect(hrefs.length).toBeGreaterThanOrEqual(2);
      expect(new Set(hrefs)).toEqual(new Set([`${APP_URL}/login`]));
    });
  });
}

test.describe('a 1280px: la nav lleva a cada sección', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const [texto, id] of [
    ['Registro', 'registro'],
    ['Funciones', 'funciones'],
    ['Free / PRO', 'planes'],
  ] as const) {
    test(`"${texto}" lleva a #${id}`, async ({ page }) => {
      await page.goto('/');
      await page
        .getByRole('navigation', { name: 'Secciones' })
        .getByRole('link', { name: texto })
        .click();
      // El scroll es suave: se espera a que la sección llegue arriba.
      await expect
        .poll(() =>
          page.locator(`#${id}`).evaluate((el) => Math.round(el.getBoundingClientRect().top)),
        )
        .toBeLessThan(160);
      const arriba = await page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top);
      expect(arriba).toBeGreaterThanOrEqual(-5);
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
    });
  }

  test('"Ver la app en acción" lleva a la captura del hero (#demo)', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('link', { name: /Ver la app en acción/ })
      .first()
      .click();
    await expect(page).toHaveURL(/#demo$/);
    await expect(page.locator('#demo')).toBeInViewport();
  });
});

test.describe('a 390px: la tabla de los planes', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('mide más que la pantalla, se enfoca con el teclado y se desplaza con las flechas', async ({
    page,
  }) => {
    await page.goto('/');
    const tabla = page.getByRole('region', { name: 'Comparación de funciones de Free y Pro' });
    await tabla.scrollIntoViewIfNeeded();

    const medidas = await tabla.evaluate((el) => ({
      ancho: el.clientWidth,
      contenido: el.scrollWidth,
    }));
    expect(medidas.contenido).toBeGreaterThan(medidas.ancho);

    await tabla.focus();
    await expect(tabla).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => tabla.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);

    // La columna de Pro es alcanzable: al final, su última celda entra en lo que se ve.
    await tabla.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    await expect(tabla.getByRole('cell', { name: 'Incluidas' }).first()).toBeInViewport();
  });
});

test.describe('las páginas legales dicen quién responde', () => {
  for (const ruta of ['/privacidad/', '/terminos/']) {
    test(`${ruta}: el nombre y el email, con un enlace mailto`, async ({ page }) => {
      await page.goto(ruta);
      const main = page.getByRole('main');
      await expect(main).toContainText(CONTACTO.nombre);
      await expect(main.locator(`a[href="mailto:${CONTACTO.email}"]`).first()).toBeVisible();
      await expect(main).not.toContainText('antes de publicar el sitio');
    });
  }

  test('/privacidad sin la barra final redirige a /privacidad/', async ({ page }) => {
    const respuesta = await page.goto('/privacidad');
    expect(respuesta?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe('/privacidad/');
  });
});
