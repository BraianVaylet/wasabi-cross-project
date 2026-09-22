import { expect, test, type Page } from '@playwright/test';
import { auditar, registrarse } from './app.ts';

/*
 * F2-10: la pantalla de Estadísticas de punta a punta (mockup 10). Un ejercicio propio
 * creado desde el formulario, con sus capacidades (F2-02, F2-03), tres marcas, y lo que
 * se ve en la evolución y en el resumen general.
 */

const API = 'http://127.0.0.1:3100';

/** Hace `meses` atrás, contra el reloj de verdad: el período se mide desde hoy. */
function haceMeses(meses: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - meses);
  date.setHours(12, 0, 0, 0);
  return date;
}

/** Como lo escribe el campo de fecha: `yyyy-mm-dd`, en la zona del navegador. */
function paraElCampo(date: Date): string {
  return date.toLocaleDateString('sv-SE');
}

/** Un ejercicio propio desde el formulario del mockup 9, con lo que entrena. */
async function crearPropio(page: Page): Promise<string> {
  await page.goto('/ejercicios/nuevo');
  await page.getByLabel('Nombre').fill('Sentadilla del garage');
  await page.getByRole('radio', { name: 'Fuerza (RM en kg)' }).check();
  await page.getByRole('checkbox', { name: 'Fuerza', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Cuádriceps' }).check();
  await page.getByLabel('RM (kg)').fill('100');
  await page.getByLabel('Fecha').fill(paraElCampo(haceMeses(5)));
  await page.getByLabel('Nivel').selectOption('intermedio');
  await page.getByRole('button', { name: 'Guardar ejercicio' }).click();

  await expect(page.getByRole('link', { name: /Sentadilla del garage/ })).toBeVisible();

  const lista = await page.request.get(`${API}/api/v1/exercises`);
  const { exercises } = (await lista.json()) as { exercises: { id: string; name: string }[] };
  const creado = exercises.find((exercise) => exercise.name === 'Sentadilla del garage');
  expect(creado, 'el ejercicio recién creado').toBeDefined();
  return creado?.id ?? '';
}

/** Las otras dos marcas van por la API: el modal ya tiene sus propios tests. */
async function cargarMarca(page: Page, id: string, value: number, meses: number): Promise<void> {
  const response = await page.request.post(`${API}/api/v1/exercises/${id}/records`, {
    data: { value, performedAt: haceMeses(meses).toISOString() },
  });
  expect(response.status(), `marca de ${String(value)}`).toBe(201);
}

test('la evolución de un ejercicio y el resumen general, con lo que se cargó', async ({ page }) => {
  await registrarse(page);
  const id = await crearPropio(page);
  await cargarMarca(page, id, 110, 4);
  await cargarMarca(page, id, 125, 1);

  await page.goto('/estadisticas');
  await expect(page.getByRole('heading', { name: 'Tus estadísticas' })).toBeVisible();
  await auditar(page, 'Estadísticas, cerrado');

  await page.getByRole('button', { name: 'Sentadilla del garage' }).click();
  await expect(page).toHaveURL(new RegExp(`abierto=${id}`));
  await expect(page.getByRole('figure', { name: /Sentadilla del garage/ })).toBeVisible();

  // Los números de las tres marcas: de 100 a 125 kg es +25%.
  const numeros = page.getByTestId('numeros');
  await expect(numeros.getByRole('definition')).toHaveText(['125 kg', '125 kg', '100 kg', '+25%']);

  // La tabla que lee un lector de pantalla tiene las mismas tres marcas que se dibujan.
  const tabla = page.getByRole('table', { name: /Sentadilla del garage/ });
  await expect(tabla.getByRole('row')).toHaveCount(4);

  // Y el propio, con sus capacidades, entra en el resumen general (F2-02).
  const general = page.getByRole('region', { name: 'En general' });
  await expect(general.getByRole('listitem').filter({ hasText: 'Fuerza' })).toContainText('+25%');
  await expect(general.getByRole('listitem').filter({ hasText: 'Cuádriceps' })).toContainText(
    '+25%',
  );

  await auditar(page, 'Estadísticas, abierto');

  await page.getByRole('button', { name: 'Cambiar a tema claro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await auditar(page, 'Estadísticas, abierto, tema claro');
});

test('el período recorta: en tres meses queda una sola marca y no hay con qué comparar', async ({
  page,
}) => {
  await registrarse(page);
  const id = await crearPropio(page);
  await cargarMarca(page, id, 110, 4);
  await cargarMarca(page, id, 125, 1);

  await page.goto(`/estadisticas?abierto=${id}`);
  await page.getByLabel('Período').selectOption('3m');

  await expect(page).toHaveURL(/periodo=3m/);
  // Del ejercicio queda la última marca sola: sin línea, un punto.
  await expect(
    page.getByRole('table', { name: /Sentadilla del garage/ }).getByRole('row'),
  ).toHaveCount(2);
  // Y en el resumen no se inventa un cero: se dice que no alcanza.
  await expect(page.getByText(/todavía no hay marcas suficientes/).first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'En general' }).getByRole('listitem')).toHaveCount(
    0,
  );
});

test('desde el menú y desde el detalle se llega a Estadísticas', async ({ page }) => {
  await registrarse(page);
  const id = await crearPropio(page);

  await page.getByRole('button', { name: 'Abrir menú' }).click();
  await page.getByRole('link', { name: 'Estadísticas' }).click();
  await expect(page.getByRole('heading', { name: 'Tus estadísticas' })).toBeVisible();

  await page.goto(`/ejercicios/${id}`);
  await page.getByRole('link', { name: 'Estadísticas' }).click();
  await expect(page).toHaveURL(new RegExp(`/estadisticas\\?abierto=${id}`));
  await expect(page.getByRole('button', { name: 'Sentadilla del garage' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
});
