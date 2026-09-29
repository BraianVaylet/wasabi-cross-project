import { expect, test, type Page } from '@playwright/test';
import { auditar, elegirDelCatalogo, registrarse } from './app.ts';

/*
 * El alta con pestañas de punta a punta (F5-12, spec §5.3), contra el catálogo nuevo sembrado:
 * un precargado tal cual, uno editado que pasa a ser propio, y las categorías que se suman en
 * la Fase 5 —cardio y hipertrofia con la carga en kg—. axe a 390px en las dos pestañas.
 */

test.use({ viewport: { width: 390, height: 1300 } });

const API = 'http://127.0.0.1:3100';

async function guardar(page: Page): Promise<void> {
  await page.getByLabel('Nivel', { exact: true }).selectOption('intermedio');
  await page.getByRole('button', { name: 'Guardar ejercicio' }).click();

  await expect(page.getByRole('heading', { name: 'Tus ejercicios' })).toBeVisible();
}

/** Lo que dice la API de la lista del usuario: es lo que decide qué cuenta como propio (§4). */
async function miLista(page: Page) {
  const response = await page.request.get(`${API}/api/v1/exercises`);
  const { exercises, usage } = (await response.json()) as {
    exercises: { name: string; isCustom: boolean }[];
    usage: { total: number; custom: number };
  };

  return { exercises: exercises.map(({ name, isCustom }) => ({ name, isCustom })), usage };
}

test('un precargado tal cual queda como del catálogo y el catálogo lo marca como ya agregado', async ({
  page,
}) => {
  await registrarse(page);

  await elegirDelCatalogo(page, 'Sentadilla trasera');
  await expect(page.getByLabel('Grupo muscular primario')).toHaveValue('cuadriceps');
  await expect(page.getByRole('status')).toContainText('Partís de Sentadilla trasera del catálogo');
  await page.getByLabel('RM (kg)').fill('100');
  await guardar(page);

  await expect(page.getByRole('link', { name: /Sentadilla trasera/ })).toBeVisible();
  const lista = await miLista(page);
  expect(lista.usage.custom).toBe(0);
  expect(lista.exercises).toEqual([{ name: 'Sentadilla trasera', isCustom: false }]);

  // Vuelve al catálogo: se ve, pero no se puede volver a elegir.
  await page.goto('/ejercicios/nuevo');
  await page.getByLabel('Buscar en el catálogo').fill('Sentadilla trasera');
  await expect(page.getByText('Ya lo tenés en tu lista')).toBeVisible();
  await expect(page.getByRole('button', { name: /Sentadilla trasera/ })).toHaveCount(0);
});

test('un precargado editado avisa, y se guarda como propio', async ({ page }) => {
  await registrarse(page);

  await elegirDelCatalogo(page, 'Sentadilla trasera');
  await page.getByLabel('Equipo (opcional)').selectOption('Kettlebell');

  await expect(page.getByRole('status')).toContainText(
    'se va a guardar como ejercicio propio y cuenta para tu límite de propios',
  );
  await auditar(page, 'Nuevo ejercicio: precargado editado');

  await page.getByLabel('RM (kg)').fill('90');
  await guardar(page);

  const lista = await miLista(page);
  expect(lista.usage.custom).toBe(1);
  expect(lista.exercises).toEqual([{ name: 'Sentadilla trasera', isCustom: true }]);

  // El del catálogo sigue disponible: lo que se agregó es otro ejercicio.
  await page.goto('/ejercicios/nuevo');
  await page.getByLabel('Buscar en el catálogo').fill('Sentadilla trasera');
  await expect(page.getByRole('button', { name: /Sentadilla trasera/ })).toBeVisible();
});

test('volver a los valores del catálogo quita el aviso y lo guarda como del catálogo', async ({
  page,
}) => {
  await registrarse(page);

  await elegirDelCatalogo(page, 'Sentadilla trasera');
  await page.getByLabel('Equipo (opcional)').selectOption('Kettlebell');
  await page.getByRole('button', { name: 'Volver a los valores del catálogo' }).click();

  await expect(page.getByRole('status')).not.toContainText('se va a guardar como ejercicio propio');
  await page.getByLabel('RM (kg)').fill('90');
  await guardar(page);

  expect((await miLista(page)).usage.custom).toBe(0);
});

test('cardio pide los metros y las calorías, y Home los muestra', async ({ page }) => {
  await registrarse(page);

  await elegirDelCatalogo(page, 'SkiErg');
  await page.getByLabel('Distancia (m)').fill('2000');
  await page.getByLabel('Calorías (kcal)').fill('120');
  await guardar(page);

  const fila = page.getByRole('link', { name: /SkiErg/ });
  await expect(fila).toContainText('2.000');
  await expect(fila).toContainText('120 kcal');
});

test('hipertrofia pide repeticiones y peso, y el detalle da la carga en kg sobre el RM estimado', async ({
  page,
}) => {
  await registrarse(page);

  await elegirDelCatalogo(page, 'Press banca plano');
  await page.getByLabel('Repeticiones', { exact: true }).fill('10');
  await page.getByLabel('Peso (kg)').fill('80');
  await guardar(page);

  await page.getByRole('link', { name: /Press banca plano/ }).click();

  // 10 × 80 kg: RM estimado 106,67 → 106,5; el 80% da 85,5 kg (spec §5.1).
  await expect(page.getByTestId('rm-estimado')).toHaveText('RM estimado 106,5 kg');
  await page.getByRole('radio', { name: '80% · 85,5 kg' }).check({ force: true });
  await expect(page.getByTestId('carga')).toHaveText('85,5 kg');
  await auditar(page, 'Detalle de hipertrofia');
});

test('las dos pestañas del alta pasan el axe a 390px', async ({ page }) => {
  await registrarse(page);

  await page.goto('/ejercicios/nuevo');
  await page.getByLabel('Buscar en el catálogo').fill('press');
  await expect(page.getByRole('button', { name: /Press militar/ })).toBeVisible();
  await auditar(page, 'Nuevo ejercicio: catálogo con resultados');

  await page.getByRole('radio', { name: 'Hyrox' }).check({ force: true });
  await auditar(page, 'Nuevo ejercicio: catálogo filtrado');

  await page.getByRole('tab', { name: 'Crear' }).click();
  await expect(page.getByLabel('Nombre')).toBeVisible();
  await auditar(page, 'Nuevo ejercicio: crear');

  await page.getByLabel('Nombre').fill('Sled Push del garage');
  await page
    .getByRole('radio', { name: 'Distancia con carga (metros y peso)' })
    .check({ force: true });
  await auditar(page, 'Nuevo ejercicio: crear con distancia con carga');
});
