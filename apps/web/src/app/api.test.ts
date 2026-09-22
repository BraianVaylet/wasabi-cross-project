import { describe, expect, it } from 'vitest';
import type { HttpClient, RequestOptions } from '../lib/http.ts';
import { createApiClient } from './api.ts';

/*
 * A qué endpoint le pega cada método y con qué. Las pantallas se prueban con una API en
 * memoria, así que sin esto una ruta o un verbo equivocados no los ve nadie hasta producción.
 */

interface Llamada {
  path: string;
  options: RequestOptions | undefined;
}

function apiEspía(respuesta?: unknown) {
  const llamadas: Llamada[] = [];
  // Escrito a mano y no con `vi.fn`: `request` es genérico y un mock pierde esa firma.
  const http: HttpClient = {
    request: (_schema, path, options) => {
      llamadas.push({ path, ...(options === undefined ? { options: undefined } : { options }) });
      return Promise.resolve(respuesta as never);
    },
  };

  return { llamadas, api: createApiClient(http) };
}

describe('cliente de API del front', () => {
  it('la lista de ejercicios', async () => {
    const { llamadas, api } = apiEspía();

    await api.listExercises();

    expect(llamadas).toEqual([{ path: '/api/v1/exercises', options: undefined }]);
  });

  it('el catálogo, y devuelve sólo los ejercicios', async () => {
    const { llamadas, api } = apiEspía({ exercises: [{ id: 'exo_a1b2c3d4' }] });

    const exercises = await api.catalog();

    expect(llamadas[0]?.path).toBe('/api/v1/exercises/catalog');
    expect(exercises).toEqual([{ id: 'exo_a1b2c3d4' }]);
  });

  it('agregar un ejercicio es un POST a la lista', async () => {
    const { llamadas, api } = apiEspía();
    const input = { source: 'catalog', exerciseId: 'exo_a1b2c3d4' } as never;

    await api.addExercise(input);

    expect(llamadas[0]).toEqual({
      path: '/api/v1/exercises',
      options: { method: 'POST', body: input },
    });
  });

  it('editar es un PATCH al ejercicio', async () => {
    const { llamadas, api } = apiEspía();

    await api.updateExercise('mex_a1b2c3d4', { level: 'avanzado' });

    expect(llamadas[0]).toEqual({
      path: '/api/v1/exercises/mex_a1b2c3d4',
      options: { method: 'PATCH', body: { level: 'avanzado' } },
    });
  });

  it('borrar es un DELETE al ejercicio', async () => {
    const { llamadas, api } = apiEspía();

    await api.deleteExercise('mex_a1b2c3d4');

    expect(llamadas[0]).toEqual({
      path: '/api/v1/exercises/mex_a1b2c3d4',
      options: { method: 'DELETE' },
    });
  });

  it('el historial pide una página por cursor', async () => {
    const { llamadas, api } = apiEspía();

    await api.history('mex_a1b2c3d4', { limit: 3 });
    await api.history('mex_a1b2c3d4', { limit: 3, cursor: 'c2' });

    expect(llamadas.map((llamada) => llamada.path)).toEqual([
      '/api/v1/exercises/mex_a1b2c3d4/records?limit=3',
      '/api/v1/exercises/mex_a1b2c3d4/records?limit=3&cursor=c2',
    ]);
  });

  it('cargar una marca es un POST al historial del ejercicio', async () => {
    const { llamadas, api } = apiEspía();

    await api.logRecord('mex_a1b2c3d4', { value: 105 });

    expect(llamadas[0]).toEqual({
      path: '/api/v1/exercises/mex_a1b2c3d4/records',
      options: { method: 'POST', body: { value: 105 } },
    });
  });

  it('las estadísticas de un ejercicio van con su período', async () => {
    const { llamadas, api } = apiEspía();

    await api.exerciseStats('mex_a1b2c3d4', '6m');

    expect(llamadas[0]).toEqual({
      path: '/api/v1/stats/exercises/mex_a1b2c3d4?period=6m',
      options: undefined,
    });
  });

  it('el resumen general va a /stats/summary con su período', async () => {
    const { llamadas, api } = apiEspía();

    await api.generalStats('todo');

    expect(llamadas[0]).toEqual({ path: '/api/v1/stats/summary?period=todo', options: undefined });
  });

  it('las preferencias se leen y se guardan en /me/preferences', async () => {
    const { llamadas, api } = apiEspía();

    await api.preferences();
    await api.savePreferences({ theme: 'light' });

    expect(llamadas).toEqual([
      { path: '/api/v1/me/preferences', options: undefined },
      { path: '/api/v1/me/preferences', options: { method: 'PATCH', body: { theme: 'light' } } },
    ]);
  });
});
