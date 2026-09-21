import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../lib/http.ts';
import { createApiClient } from './api.ts';

/*
 * A qué endpoint le pega cada método y con qué. Las pantallas se prueban con una API en
 * memoria, así que sin esto una ruta o un verbo equivocados no los ve nadie hasta producción.
 */
function apiEspía() {
  const request = vi.fn<HttpClient['request']>(() => Promise.resolve(undefined as never));
  return { request, api: createApiClient({ request }) };
}

describe('cliente de API del front', () => {
  it('la lista de ejercicios', async () => {
    const { request, api } = apiEspía();

    await api.listExercises();

    expect(request).toHaveBeenCalledWith(expect.anything(), '/api/v1/exercises');
  });

  it('el catálogo, y devuelve sólo los ejercicios', async () => {
    const request = vi.fn<HttpClient['request']>(() =>
      Promise.resolve({ exercises: [{ id: 'exo_a1b2c3d4' }] } as never),
    );

    const exercises = await createApiClient({ request }).catalog();

    expect(request).toHaveBeenCalledWith(expect.anything(), '/api/v1/exercises/catalog');
    expect(exercises).toEqual([{ id: 'exo_a1b2c3d4' }]);
  });

  it('agregar un ejercicio es un POST a la lista', async () => {
    const { request, api } = apiEspía();
    const input = { source: 'catalog', exerciseId: 'exo_a1b2c3d4' } as never;

    await api.addExercise(input);

    expect(request).toHaveBeenCalledWith(expect.anything(), '/api/v1/exercises', {
      method: 'POST',
      body: input,
    });
  });

  it('editar es un PATCH al ejercicio', async () => {
    const { request, api } = apiEspía();

    await api.updateExercise('mex_a1b2c3d4', { level: 'avanzado' });

    expect(request).toHaveBeenCalledWith(expect.anything(), '/api/v1/exercises/mex_a1b2c3d4', {
      method: 'PATCH',
      body: { level: 'avanzado' },
    });
  });

  it('borrar es un DELETE al ejercicio', async () => {
    const { request, api } = apiEspía();

    await api.deleteExercise('mex_a1b2c3d4');

    expect(request).toHaveBeenCalledWith(expect.anything(), '/api/v1/exercises/mex_a1b2c3d4', {
      method: 'DELETE',
    });
  });

  it('las preferencias se leen y se guardan en /me/preferences', async () => {
    const { request, api } = apiEspía();

    await api.preferences();
    await api.savePreferences({ theme: 'light' });

    expect(request).toHaveBeenNthCalledWith(1, expect.anything(), '/api/v1/me/preferences');
    expect(request).toHaveBeenNthCalledWith(2, expect.anything(), '/api/v1/me/preferences', {
      method: 'PATCH',
      body: { theme: 'light' },
    });
  });
});
