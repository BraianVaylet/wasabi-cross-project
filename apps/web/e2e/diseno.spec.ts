import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { auditar, elegirDelCatalogo, registrarse } from './app.ts';

/*
 * F4-11: el tema único de punta a punta, al ancho del diseño (390px). Las pantallas que el
 * resto de la suite no audita, y la captura de referencia del detalle: es lo que avisa si un
 * cambio futuro lo aleja de docs/design.
 */

test.use({ viewport: { width: 390, height: 1300 } });

const CAPTURA = 'detalle-390.png';

/**
 * Un Back squat con las tres marcas del diseño (60, 80 y 100 kg, en las fechas del PNG),
 * cargado directo en la API: el formulario pone la fecha de hoy y la captura tiene que ser
 * siempre la misma. Desde la página, para viajar con su sesión y su origen.
 */
async function backSquatDelDiseno(page: Page, testInfo: TestInfo): Promise<string> {
  const api = String(testInfo.config.metadata.apiURL);

  return page.evaluate(async (base) => {
    const opciones = (body: unknown): RequestInit => ({
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    // Propio y no del catálogo: el diseño es de un "Back squat", y el catálogo lo llama
    // "Sentadilla trasera". El detalle se ve igual en los dos casos.
    const alta = await fetch(
      `${base}/api/v1/exercises`,
      opciones({
        source: 'custom',
        name: 'Back squat',
        category: 'fuerza',
        capacities: ['fuerza'],
        primaryMuscleGroup: 'cuadriceps',
        secondaryMuscleGroups: ['gluteo', 'core'],
        disciplines: [],
        level: 'intermedio',
        firstRecord: { value: 60, performedAt: '2025-06-02T12:00:00.000Z' },
      }),
    );
    const { id } = (await alta.json()) as { id: string };

    for (const [value, performedAt] of [
      [80, '2026-02-23T12:00:00.000Z'],
      [100, '2026-06-23T12:00:00.000Z'],
    ] as const) {
      await fetch(`${base}/api/v1/exercises/${id}/records`, opciones({ value, performedAt }));
    }
    return id;
  }, api);
}

test('el detalle, igual al diseño @captura', async ({ page }, testInfo) => {
  test.skip(
    process.platform !== 'linux',
    'la referencia es la del CI, en Linux: las fuentes se dibujan distinto en cada sistema',
  );
  const referencia = join(testInfo.project.testDir, '__capturas__', `detalle-390-linux.png`);
  // Sin `--update-snapshots` el modo es 'missing' (el default), no 'none': si no se lo pide
  // explícitamente, una captura que falta no se escribe acá, se saltea.
  const actualizando = ['all', 'changed'].includes(testInfo.config.updateSnapshots);
  test.skip(
    !existsSync(referencia) && !actualizando,
    'falta la captura de referencia: la genera el job de E2E del CI y se commitea',
  );

  // Con el progreso a la vista: es una estadística, y es de Pro (spec §4).
  await registrarse(page, { plan: 'pro' });
  const id = await backSquatDelDiseno(page, testInfo);
  await page.goto(`/ejercicios/${id}`);

  // Todo lo que llega aparte ya llegó: el historial, la evolución y las fuentes.
  await expect(page.getByText('03 registros')).toBeVisible();
  await expect(page.getByRole('figure', { name: 'RM registrado' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await auditar(page, 'Detalle, como el diseño');

  await expect(page).toHaveScreenshot(CAPTURA, {
    animations: 'disabled',
    // Un margen chico para el suavizado de bordes; un cambio de lugar o de color lo pasa.
    maxDiffPixelRatio: 0.01,
  });
});

test('el detalle de un ejercicio de tiempo, con la mejor marca en la barra', async ({ page }) => {
  await registrarse(page);
  await elegirDelCatalogo(page, 'Carrera 1 km');
  await page.getByLabel('Tiempo (mm:ss)').fill('0432');
  await page.getByLabel('Desnivel (m)').fill('0');
  await page.getByLabel('Nivel', { exact: true }).selectOption('principiante');
  await page.getByRole('button', { name: 'Guardar ejercicio' }).click();

  await page.getByRole('link', { name: /Carrera 1 km/ }).click();
  await expect(page.getByRole('region', { name: 'Mejor marca' })).toContainText('4:32');
  await auditar(page, 'Detalle de un tiempo');
});

test('nuevo ejercicio, el menú y la página que no existe', async ({ page }) => {
  await registrarse(page);

  await page.goto('/ejercicios/nuevo');
  await expect(page.getByRole('heading', { name: 'Nuevo ejercicio' })).toBeVisible();
  await auditar(page, 'Nuevo ejercicio: catálogo');

  await page.getByRole('tab', { name: 'Crear' }).click();
  await auditar(page, 'Nuevo ejercicio: crear');

  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await expect(page.getByRole('dialog', { name: 'Menú principal' })).toBeVisible();
  await auditar(page, 'Menú abierto');
  await page.keyboard.press('Escape');

  await page.goto('/no-existe');
  await expect(page.getByText('No encontramos lo que buscás.')).toBeVisible();
  await auditar(page, 'Página que no existe');
});
