import { expect, test } from '@playwright/test';
import { agregarDelCatalogo, auditar, registrarse } from './app.ts';

/*
 * El camino que justifica el producto (spec §10): registrarse, agregar un ejercicio del
 * catálogo, cargar una marca y ver la carga de trabajo calculada en el detalle.
 */

test('de cero a los porcentajes del detalle', async ({ page }) => {
  await registrarse(page);

  await expect(page.getByText('Todavía no tenés ejercicios')).toBeVisible();
  await auditar(page, 'Home vacía');

  await agregarDelCatalogo(page, 'Back squat', '100');

  await expect(page.getByRole('link', { name: /Back squat/ })).toBeVisible();
  await expect(page.getByText('100 kg')).toBeVisible();
  await auditar(page, 'Home con ejercicios');

  // El tema claro es la otra mitad de la paleta: su contraste se mira igual (spec §11).
  await page.getByRole('button', { name: 'Cambiar a tema claro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await auditar(page, 'Home con ejercicios, tema claro');
  await page.getByRole('button', { name: 'Cambiar a tema oscuro' }).click();

  await page.getByRole('link', { name: /Back squat/ }).click();
  await expect(page.getByRole('heading', { name: 'Back squat' })).toBeVisible();

  // 65% de 100 kg, redondeado al medio kilo de arriba (spec §5.2).
  await expect(page.getByTestId('carga')).toHaveText('65 kg');
  await expect(page.getByRole('radio', { name: '90% · 90 kg' })).toBeVisible();
  await auditar(page, 'Detalle del ejercicio');

  // Otro porcentaje no le pregunta nada a la API, y queda en la URL. Se toca la etiqueta,
  // que es lo que toca una persona: el radio de adentro está oculto a propósito.
  await page.getByRole('radio', { name: '85% · 85 kg' }).locator('..').click();
  await expect(page.getByRole('radio', { name: '85% · 85 kg' })).toBeChecked();
  await expect(page.getByTestId('carga')).toHaveText('85 kg');
  await expect(page).toHaveURL(/pct=85/);
});

test('una marca nueva mueve el valor actual y la tabla', async ({ page }) => {
  await registrarse(page);
  await agregarDelCatalogo(page, 'Back squat', '100');

  await page.getByRole('link', { name: /Back squat/ }).click();
  await page.getByRole('button', { name: 'Nuevo RM' }).click();

  const modal = page.getByRole('dialog', { name: 'Nuevo RM' });
  await auditar(page, 'Modal de marca nueva');
  await modal.getByLabel('RM (kg)').fill('120');
  await modal.getByRole('button', { name: 'Guardar' }).click();

  await expect(page.getByRole('list', { name: 'Historial' }).getByText('120 kg')).toBeVisible();
  await expect(page.getByTestId('carga')).toHaveText('78 kg');

  // El valor actual también cambió en la lista, que es otra consulta.
  await page.getByRole('link', { name: 'Ejercicios' }).click();
  await expect(page.getByText('120 kg')).toBeVisible();
});

test('el perfil y la edición también pasan la auditoría', async ({ page }) => {
  await registrarse(page);
  await agregarDelCatalogo(page, 'Back squat', '100');

  await page.goto('/perfil');
  await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible();
  await auditar(page, 'Perfil');

  await page.goto('/');
  await page.getByRole('link', { name: /Back squat/ }).click();
  await page.getByRole('link', { name: 'Editar' }).click();
  await expect(page.getByRole('heading', { name: 'Editar ejercicio' })).toBeVisible();
  await auditar(page, 'Editar ejercicio');
});

test('las pantallas públicas también', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  await auditar(page, 'Entrar');

  await page.getByRole('link', { name: 'Crear una cuenta' }).click();
  await expect(page.getByRole('heading', { name: 'Crear una cuenta' })).toBeVisible();
  await auditar(page, 'Crear una cuenta');

  await page.goto('/ejercicios/nuevo');
  // Sin sesión no hay pantalla privada: manda a entrar y se acuerda de a dónde iba.
  await expect(page).toHaveURL(/\/login\?redirect=/);
});
