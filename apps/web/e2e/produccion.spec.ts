import { expect, test } from '@playwright/test';
import { BOTON_DESARROLLO, atletaNuevo, elegirEnElIdp, pedirMe } from './app.ts';

/*
 * F3-05: lo que sólo existe en el build de producción servido por la API (ADR-0007). En el
 * modo de desarrollo estos tests no corren: no hay service worker ni caché de assets.
 */

test.beforeEach(({ page: _page }, testInfo) => {
  test.skip(testInfo.config.metadata.target !== 'prod', 'sólo contra el build de producción');
});

test('una ruta de la SPA pedida de cero la resuelve el front, no un 404', async ({ page }) => {
  const response = await page.goto('/estadisticas');

  expect(response?.status()).toBe(200);
  // Sin sesión, el front manda a entrar y se acuerda de a dónde iba.
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
});

test('los assets con hash se cachean un año y el index.html se revalida', async ({ page }) => {
  const assets: string[] = [];
  page.on('response', (response) => {
    if (response.url().includes('/assets/')) {
      assets.push(response.headers()['cache-control'] ?? '');
    }
  });

  const pagina = await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();

  expect(pagina?.headers()['cache-control']).toBe('no-cache');
  expect(assets.length).toBeGreaterThan(0);
  expect(new Set(assets)).toEqual(new Set(['public, max-age=31536000, immutable']));
});

test('el service worker se registra: la PWA se puede instalar y avisar versiones', async ({
  page,
}) => {
  await page.goto('/login');

  const activo = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL ?? null;
  });

  expect(activo).toMatch(/\/sw\.js$/);
});

test('ni la CSP ni el navegador se quejan al cargar la app', async ({ page }) => {
  const errores: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('401')) {
      errores.push(message.text());
    }
  });

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();

  expect(errores).toEqual([]);
});

test('con el service worker controlando la página, el callback del proveedor abre la sesión (F9-05, F9-09)', async ({
  page,
}) => {
  await page.goto('/login');
  // El service worker se instala en la primera visita y recién controla la página en la siguiente.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  const controlada = await page.evaluate(() => navigator.serviceWorker.controller !== null);
  expect(controlada, 'el service worker tiene que estar controlando la página').toBe(true);

  // La vuelta del proveedor es una navegación a `/api/auth/callback/...`: Workbox contestaba con el
  // `index.html` de la app y la API nunca veía el código (`navigateFallbackDenylist`, F9-05).
  await page.getByRole('button', { name: BOTON_DESARROLLO }).click();
  const atleta = atletaNuevo();
  await elegirEnElIdp(page, { email: atleta.email, nombre: atleta.nombre });

  await expect(page.getByRole('heading', { name: 'Tus ejercicios' })).toBeVisible();
  const me = await pedirMe(page);
  expect(me.status()).toBe(200);
  expect(await me.json()).toMatchObject({ email: atleta.email });
});
