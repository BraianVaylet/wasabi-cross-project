import { expect, test, type APIRequestContext } from '@playwright/test';
import { measureKindFor, type ExerciseCategory } from '@wasabi-cross/schemas';
import { auditar, registrarse } from './app.ts';

/*
 * El límite del plan Free (F1-03, spec §4): 10 ejercicios en total y 3 propios. La pantalla
 * lo refleja, pero quien decide es el backend — el E2E lo prueba por los dos lados, porque
 * un botón deshabilitado no es una regla de negocio.
 *
 * Los ejercicios se cargan por la API: el formulario ya tiene sus propios tests, y diez
 * altas a mano no prueban nada que no pruebe una.
 */

const API = 'http://127.0.0.1:3100';

const propio = (numero: number) => ({
  source: 'custom',
  name: `Propio ${String(numero)}`,
  category: 'fuerza',
  capacities: ['fuerza'],
  muscleGroups: ['cuadriceps'],
  level: 'intermedio',
  firstRecord: { value: 50 + numero },
});

async function catalogo(
  request: APIRequestContext,
  cuantos: number,
): Promise<{ id: string; category: ExerciseCategory }[]> {
  const response = await request.get(`${API}/api/v1/exercises/catalog`);
  const { exercises } = (await response.json()) as {
    exercises: { id: string; category: ExerciseCategory }[];
  };

  expect(exercises.length).toBeGreaterThanOrEqual(cuantos);
  return exercises.slice(0, cuantos).map((exercise) => ({
    id: exercise.id,
    category: exercise.category,
  }));
}

/** Hipertrofia pide peso y running pide desnivel, junto al valor (spec §5.1). */
function firstRecordExtraFor(category: ExerciseCategory): Record<string, number> {
  const kind = measureKindFor(category);
  if (kind === 'weighted_reps') {
    return { weightKg: 40 };
  }
  if (kind === 'time') {
    return { elevationGainM: 0 };
  }
  return {};
}

async function llenarPlan(request: APIRequestContext, cuantos: number): Promise<void> {
  for (const { id: exerciseId, category } of await catalogo(request, cuantos)) {
    const response = await request.post(`${API}/api/v1/exercises`, {
      data: {
        source: 'catalog',
        exerciseId,
        level: 'intermedio',
        firstRecord: { value: 60, ...firstRecordExtraFor(category) },
      },
    });

    expect(response.status(), `alta de ${exerciseId}`).toBe(201);
  }
}

test('el 11.º ejercicio no entra: ni por la UI ni por la API', async ({ page }) => {
  await registrarse(page);

  // `page.request` comparte las cookies del navegador: es el mismo usuario.
  await llenarPlan(page.request, 10);

  await page.goto('/');
  await expect(page.getByText('Alcanzaste el máximo de 10 de tu plan Free.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nuevo ejercicio' })).toBeDisabled();
  await auditar(page, 'Home en el límite del plan');

  // Y el que se saltea la pantalla, tampoco.
  const directo = await page.request.post(`${API}/api/v1/exercises`, { data: propio(11) });

  expect(directo.status()).toBe(403);
  expect(await directo.json()).toMatchObject({
    errorCode: 'WC-SUBS-403-001',
    message: 'Alcanzaste el máximo de 10 ejercicios de tu plan Free.',
  });

  // El rechazo no dejó nada a medias.
  const lista = await page.request.get(`${API}/api/v1/exercises`);
  const { exercises } = (await lista.json()) as { exercises: unknown[] };
  expect(exercises).toHaveLength(10);
});

test('el cuarto ejercicio propio se rechaza aunque sobre lugar en el total', async ({ page }) => {
  await registrarse(page);

  for (const numero of [1, 2, 3]) {
    const response = await page.request.post(`${API}/api/v1/exercises`, { data: propio(numero) });
    expect(response.status(), `alta del propio ${String(numero)}`).toBe(201);
  }

  const cuarto = await page.request.post(`${API}/api/v1/exercises`, { data: propio(4) });

  expect(cuarto.status()).toBe(403);
  expect(await cuarto.json()).toMatchObject({
    errorCode: 'WC-SUBS-403-001',
    message: 'Alcanzaste el máximo de 3 ejercicios propios de tu plan Free.',
  });
});
