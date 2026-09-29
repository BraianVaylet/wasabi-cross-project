import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/*
 * Lo que comparten los E2E: un atleta nuevo por test (la base es una sola y no se limpia
 * entre pruebas) y la auditoría de accesibilidad.
 */

export interface Atleta {
  email: string;
  nombre: string;
  password: string;
}

export function atletaNuevo(): Atleta {
  return {
    email: `e2e-${crypto.randomUUID()}@example.com`,
    nombre: 'Braian',
    password: 'contrasena-larga-1',
  };
}

/** Registro por la pantalla (mockup 3): deja la sesión abierta y devuelve al atleta. */
export async function registrarse(page: Page): Promise<Atleta> {
  const atleta = atletaNuevo();

  await page.goto('/registro');
  await page.getByLabel('Email').fill(atleta.email);
  await page.getByLabel('Nombre').fill(atleta.nombre);
  await page.getByLabel('Contraseña', { exact: true }).fill(atleta.password);
  await page.getByLabel('Repetir contraseña').fill(atleta.password);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page.getByRole('heading', { name: 'Tus ejercicios' })).toBeVisible();
  return atleta;
}

/**
 * Entra por la pestaña Catálogo y elige un precargado por su nombre: el formulario queda con su
 * definición cargada, a la espera de la primera marca.
 */
export async function elegirDelCatalogo(page: Page, nombre: string): Promise<void> {
  await page.goto('/ejercicios/nuevo');
  await page.getByLabel('Buscar en el catálogo').fill(nombre);
  await page.getByRole('button', { name: new RegExp(nombre) }).click();
  await expect(page.getByLabel('Nombre')).toHaveValue(nombre);
}

/** Agrega un ejercicio del catálogo con su primera marca, desde el formulario del mockup 9. */
export async function agregarDelCatalogo(page: Page, nombre: string, valor: string): Promise<void> {
  await elegirDelCatalogo(page, nombre);
  await page.getByLabel('RM (kg)').fill(valor);
  await page.getByLabel('Nivel').selectOption('intermedio');
  await page.getByRole('button', { name: 'Guardar ejercicio' }).click();

  await expect(page.getByRole('heading', { name: 'Tus ejercicios' })).toBeVisible();
}

/**
 * Sin violaciones WCAG 2.2 AA en la pantalla que está abierta (spec §11). Las reglas de
 * contraste corren en el navegador de verdad: es lo que jsdom no puede mirar.
 *
 * Espera a que terminen las transiciones: axe mide el color que hay en ese instante, y una
 * pestaña recién elegida a mitad de camino entre dos colores falla un contraste que no tiene.
 */
export async function auditar(page: Page, pantalla: string): Promise<void> {
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((animation) => animation.finished)),
  );

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  // Con el elemento y el motivo: una violación sin el nodo que la causa no se arregla.
  const detalle = violations.flatMap((violation) =>
    violation.nodes.map(
      (node) =>
        `${violation.id} en ${node.target.join(' ')} — ${node.failureSummary ?? violation.help}`,
    ),
  );

  expect(detalle, `Violaciones de accesibilidad en ${pantalla}`).toEqual([]);
}
