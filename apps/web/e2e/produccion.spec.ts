import { expect, test } from '@playwright/test';

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
  // El tema lo aplicó el bootstrap antes de React: no hubo parpadeo.
  await expect(page.locator('html')).toHaveAttribute('data-theme', /dark|light/);

  expect(errores).toEqual([]);
});
