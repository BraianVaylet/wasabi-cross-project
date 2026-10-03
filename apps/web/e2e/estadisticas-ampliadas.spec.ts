import { expect, test, type Page } from '@playwright/test';
import { agregarDelCatalogo, auditar, registrarse } from './app.ts';

/*
 * F7-07: las secciones nuevas de Estadísticas de punta a punta (spec §5.4), con datos
 * cargados de verdad y axe al ancho del diseño.
 */

test.use({ viewport: { width: 390, height: 1300 } });

const API = 'http://127.0.0.1:3100';

function haceMeses(meses: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - meses);
  date.setHours(12, 0, 0, 0);
  return date;
}

/** Un propio sin disciplinas: va a "Sin disciplina". Su primera marca, hace 5 meses. */
async function crearPropio(page: Page): Promise<string> {
  await page.goto('/ejercicios/nuevo?modo=crear');
  await page.getByLabel('Nombre').fill('Sentadilla del garage');
  await page.getByRole('radio', { name: 'Fuerza (RM en kg)' }).check();
  await page.getByRole('checkbox', { name: 'Fuerza', exact: true }).check();
  await page.getByLabel('Grupo muscular primario').selectOption('Cuádriceps');
  await page.getByLabel('RM (kg)').fill('100');
  await page.getByLabel('Fecha').fill(haceMeses(5).toLocaleDateString('sv-SE'));
  await page.getByLabel('Nivel').selectOption('intermedio');
  await page.getByRole('button', { name: 'Guardar ejercicio' }).click();
  await expect(page.getByRole('link', { name: /Sentadilla del garage/ })).toBeVisible();

  const lista = await page.request.get(`${API}/api/v1/exercises`);
  const { exercises } = (await lista.json()) as { exercises: { id: string; name: string }[] };
  return exercises.find((exercise) => exercise.name === 'Sentadilla del garage')?.id ?? '';
}

async function cargarMarca(page: Page, id: string, value: number, meses: number): Promise<void> {
  const response = await page.request.post(`${API}/api/v1/exercises/${id}/records`, {
    data: { value, performedAt: haceMeses(meses).toISOString() },
  });
  expect(response.status(), `marca de ${String(value)}`).toBe(201);
}

test('constancia, récords y tu entrenamiento con lo que se cargó', async ({ page }) => {
  await registrarse(page, { plan: 'pro' });
  const id = await crearPropio(page);
  // 100 → 110 → 125: dos mejores marcas nuevas en el último año.
  await cargarMarca(page, id, 110, 4);
  await cargarMarca(page, id, 125, 1);
  // Sentadilla trasera: musculación, crossfit e hybrid; cuádriceps con glúteo y core.
  await agregarDelCatalogo(page, 'Sentadilla trasera', '140');

  await page.goto('/estadisticas');

  const constancia = page.getByTestId('constancia');
  await expect(constancia).toContainText('Marcas4');
  await expect(constancia).toContainText('Récords nuevos2');
  await expect(constancia).toContainText('Última marcahoy');

  const mejoras = page.getByRole('region', { name: 'Lo que más mejoró' });
  await expect(mejoras.getByRole('link', { name: /Sentadilla del garage/ })).toContainText('+25%');

  // Cuatro menciones: las tres de la trasera y el propio, que no tiene disciplina.
  const disciplinas = page.getByRole('list', { name: 'Disciplinas' }).getByRole('listitem');
  await expect(disciplinas).toHaveCount(4);
  await expect(disciplinas.last()).toContainText('Sin disciplina');
  await expect(disciplinas.last()).toContainText('25%');

  // Cuádriceps es primario en los dos; glúteo y core, secundarios de la trasera.
  const grupos = page.getByRole('list', { name: 'Grupos musculares' }).getByRole('listitem');
  await expect(grupos.first()).toContainText('Cuádriceps');
  await expect(grupos).toHaveCount(3);

  await auditar(page, 'Estadísticas con las secciones nuevas');
});
