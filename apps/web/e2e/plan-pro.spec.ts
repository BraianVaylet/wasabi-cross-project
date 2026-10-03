import { expect, test } from '@playwright/test';
import { agregarDelCatalogo, auditar, fijarPlan, registrarse } from './app.ts';

/*
 * Free y Pro de punta a punta (F8-06, spec §4 y §5.5): lo único que separa a los planes es ver las
 * estadísticas. El front lo muestra, pero quien decide es la API — el E2E lo prueba por los dos
 * lados, porque un aviso en pantalla no es una regla de negocio. axe a 390px.
 *
 * Los atletas nacen Free, como cualquiera; el plan Pro se lo da `fijarPlan` (no hay pago todavía).
 */

test.use({ viewport: { width: 390, height: 1300 } });

const API = 'http://127.0.0.1:3100';
const AVISO = 'Las estadísticas son parte del plan Pro.';
const ETIQUETA_PRO = 'Plan Pro: administrar suscripción';

test('con plan Free, Estadísticas y el progreso muestran el aviso; la API las niega; lo demás sigue', async ({
  page,
}) => {
  await registrarse(page);
  await agregarDelCatalogo(page, 'Sentadilla trasera', '100');

  // El header no marca lo que no se tiene.
  await expect(page.getByRole('link', { name: ETIQUETA_PRO })).toHaveCount(0);

  await page.goto('/estadisticas');
  await expect(page.getByRole('heading', { name: 'Tus estadísticas' })).toBeVisible();
  await expect(page.getByText(AVISO)).toBeVisible();
  await expect(page.getByRole('list', { name: 'Ejercicios' })).toHaveCount(0);
  await auditar(page, 'Estadísticas con plan Free');

  // El detalle: el progreso es el aviso; la carga, el historial y la barra siguen.
  await page.goto('/');
  await page.getByRole('link', { name: /Sentadilla trasera/ }).click();
  await expect(page.getByRole('heading', { name: 'Progreso del RM' })).toBeVisible();
  await expect(page.getByText(AVISO)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Elegí tu carga' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Historial de RM' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Registrar nuevo RM' })).toBeEnabled();
  await expect(page.getByRole('link', { name: /Ver estadísticas/ })).toHaveCount(0);
  await auditar(page, 'Detalle con plan Free');

  // Y el que se saltea la pantalla, tampoco las ve: la regla es de la API.
  const resumen = await page.request.get(`${API}/api/v1/stats/summary`);
  expect(resumen.status()).toBe(403);
  expect(await resumen.json()).toMatchObject({ errorCode: 'WC-SUBS-403-002', message: AVISO });
  const lista = await page.request.get(`${API}/api/v1/exercises`);
  expect(lista.status()).toBe(200);
});

test('"Ver planes" lleva a la suscripción, que dice lo que se paga y que todavía no se puede cambiar', async ({
  page,
}) => {
  await registrarse(page);

  await page.goto('/estadisticas');
  await page.getByRole('link', { name: 'Ver planes' }).click();
  await expect(page).toHaveURL(/\/suscripcion$/);

  const actual = page.getByRole('region', { name: 'Tu plan actual' });
  await expect(actual).toContainText('Free');
  await expect(actual).toContainText('$0');
  await expect(page.getByRole('group', { name: /^Pro/ })).toContainText('A definir');
  await auditar(page, 'Suscripción con plan Free');

  await page.getByRole('button', { name: 'Pasar a Pro' }).click();
  await expect(page.getByRole('status')).toContainText(
    'Cambiar de plan todavía no está disponible: se habilita junto con el pago.',
  );
  await auditar(page, 'Suscripción con el aviso de cambio');

  // No pasó nada: sigue siendo Free, también para la API.
  await page.reload();
  await expect(page.getByRole('link', { name: ETIQUETA_PRO })).toHaveCount(0);
  expect((await page.request.get(`${API}/api/v1/stats/summary`)).status()).toBe(403);
});

test('el Perfil dice el plan y lleva a la suscripción', async ({ page }) => {
  await registrarse(page);

  await page.goto('/perfil');
  const plan = page.getByRole('region', { name: 'Tu plan' });
  await expect(plan).toContainText('Free');
  await auditar(page, 'Perfil con el plan');

  await plan.getByRole('link', { name: 'Administrar suscripción' }).click();
  await expect(page).toHaveURL(/\/suscripcion$/);
});

test('con plan Pro, ve sus estadísticas, el header lo dice y la API las entrega', async ({
  page,
}) => {
  await registrarse(page, { plan: 'pro' });
  await agregarDelCatalogo(page, 'Sentadilla trasera', '100');

  await page.goto('/estadisticas');
  await expect(page.getByRole('list', { name: 'Ejercicios' })).toBeVisible();
  await expect(page.getByText(AVISO)).toHaveCount(0);
  await auditar(page, 'Estadísticas con plan Pro');

  await page.goto('/');
  await page.getByRole('link', { name: /Sentadilla trasera/ }).click();
  await expect(page.getByRole('link', { name: /Ver estadísticas/ })).toBeVisible();
  await expect(page.getByText(AVISO)).toHaveCount(0);

  expect((await page.request.get(`${API}/api/v1/stats/summary`)).status()).toBe(200);

  // La etiqueta del header lleva a la suscripción, que dice Pro.
  await page.getByRole('link', { name: ETIQUETA_PRO }).click();
  await expect(page).toHaveURL(/\/suscripcion$/);
  const actual = page.getByRole('region', { name: 'Tu plan actual' });
  await expect(actual).toContainText('Pro');
  await expect(actual).toContainText('A definir');
  await auditar(page, 'Suscripción con plan Pro');

  await page.getByRole('button', { name: 'Pasar a Free' }).click();
  await expect(page.getByRole('status')).toContainText('todavía no está disponible');
});

test('subir de plan se nota sin volver a entrar; bajar, también, y no se ve un error', async ({
  page,
}) => {
  const atleta = await registrarse(page);
  await agregarDelCatalogo(page, 'Sentadilla trasera', '100');
  expect((await page.request.get(`${API}/api/v1/stats/summary`)).status()).toBe(403);

  // Sube: la API lo lee en el pedido siguiente; la pantalla, al recargar.
  await fijarPlan(atleta.email, 'pro');
  expect((await page.request.get(`${API}/api/v1/stats/summary`)).status()).toBe(200);
  await page.reload();
  await expect(page.getByRole('link', { name: ETIQUETA_PRO })).toBeVisible();

  // Baja en otro dispositivo, sin que esta pantalla se entere: todavía cree que es Pro y pide las
  // estadísticas por primera vez. La API dice que no, y lo que se ve es el aviso de siempre, no un
  // error con un código.
  await fijarPlan(atleta.email, 'free');
  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page.getByRole('link', { name: 'Estadísticas' }).click();
  await expect(page.getByText(AVISO)).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);

  // Y lo cargado sigue ahí: bajar de plan no borra nada (spec §4).
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Sentadilla trasera/ })).toBeVisible();
});
