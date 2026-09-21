import type { ExerciseList, ManagedExerciseSummary } from '@wasabi-cross/schemas';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/http.ts';
import { braian, fakeApi, fakeSession, renderApp } from '../test/app.tsx';

const delCatalogo: ManagedExerciseSummary = {
  id: 'mex_a1b2c3d4',
  exerciseId: 'exo_a1b2c3d4',
  name: 'Back squat',
  category: 'fuerza',
  kind: 'rm',
  isCustom: false,
  level: 'principiante',
  withPain: false,
  notes: 'Con cinturón',
  current: { value: 100, unit: 'kg', performedAt: '2026-06-23T12:00:00.000Z' },
};

const propio: ManagedExerciseSummary = {
  ...delCatalogo,
  id: 'mex_z9y8x7w6',
  exerciseId: 'exo_z9y8x7w6',
  name: 'Wall ball',
  category: 'gimnastico',
  kind: 'reps',
  isCustom: true,
  current: { value: 30, unit: 'reps', performedAt: '2026-06-23T12:00:00.000Z' },
};

function lista(exercises: ManagedExerciseSummary[]): ExerciseList {
  return {
    exercises,
    usage: { plan: 'free', total: exercises.length, custom: 1, maxTotal: 10, maxCustom: 3 },
  };
}

function renderEdicion(id: string, exercises = [delCatalogo, propio]) {
  const api = fakeApi(lista(exercises));
  const app = renderApp(`/ejercicios/${id}/editar`, fakeSession(braian).client, api.client);
  return { api, ...app };
}

describe('Editar y borrar un ejercicio (F1-15)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
  });

  describe('editar', () => {
    it('se llega desde el lápiz del detalle', async () => {
      const api = fakeApi(lista([delCatalogo]));
      const { router } = renderApp(
        '/ejercicios/mex_a1b2c3d4',
        fakeSession(braian).client,
        api.client,
      );
      await screen.findByRole('heading', { name: 'Back squat' });

      await userEvent.click(screen.getByRole('link', { name: 'Editar' }));

      expect(router.state.location.pathname).toBe('/ejercicios/mex_a1b2c3d4/editar');
    });

    it('trae lo que ya estaba cargado', async () => {
      renderEdicion('mex_a1b2c3d4');

      expect(await screen.findByLabelText('Nivel')).toHaveValue('principiante');
      expect(screen.getByLabelText('Comentarios')).toHaveValue('Con cinturón');
      expect(screen.getByLabelText('Con dolor')).not.toBeChecked();
    });

    it('en uno del catálogo, el nombre no se edita', async () => {
      renderEdicion('mex_a1b2c3d4');
      await screen.findByLabelText('Nivel');

      expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument();
      expect(screen.getByText('Back squat')).toBeInTheDocument();
    });

    it('en uno propio, el nombre sí', async () => {
      renderEdicion('mex_z9y8x7w6');

      expect(await screen.findByLabelText('Nombre')).toHaveValue('Wall ball');
    });

    it('guarda sólo lo que cambió y vuelve al detalle', async () => {
      const { api, router } = renderEdicion('mex_a1b2c3d4');
      await screen.findByLabelText('Nivel');

      await userEvent.selectOptions(screen.getByLabelText('Nivel'), 'avanzado');
      await userEvent.click(screen.getByLabelText('Con dolor'));
      await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      await waitFor(() => {
        expect(api.client.updateExercise).toHaveBeenCalledWith('mex_a1b2c3d4', {
          level: 'avanzado',
          withPain: true,
        });
      });
      expect(await screen.findByRole('heading', { name: 'Back squat' })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/ejercicios/mex_a1b2c3d4');
    });

    it('sin cambios no llama a la API', async () => {
      const { api } = renderEdicion('mex_a1b2c3d4');
      await screen.findByLabelText('Nivel');

      await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      expect(await screen.findByText('No cambiaste nada todavía.')).toBeInTheDocument();
      expect(api.client.updateExercise).not.toHaveBeenCalled();
    });

    it('si la API rechaza el cambio, lo dice con su código', async () => {
      const { api } = renderEdicion('mex_z9y8x7w6');
      api.client.updateExercise.mockRejectedValueOnce(
        new ApiError(409, 'WC-EXO-409-004', 'Ese ejercicio ya existe en el catálogo.', 'req-1'),
      );
      await screen.findByLabelText('Nombre');

      await userEvent.clear(screen.getByLabelText('Nombre'));
      await userEvent.type(screen.getByLabelText('Nombre'), 'Back squat');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Ese ejercicio ya existe en el catálogo.');
      expect(alert).toHaveTextContent('WC-EXO-409-004');
    });
  });

  describe('borrar (spec §11: confirmación con el nombre escrito)', () => {
    it('el botón está deshabilitado hasta escribir el nombre igual', async () => {
      const { api } = renderEdicion('mex_a1b2c3d4');
      await screen.findByLabelText('Nivel');

      const borrar = screen.getByRole('button', { name: 'Borrar ejercicio' });
      expect(borrar).toBeDisabled();

      await userEvent.type(screen.getByLabelText('Escribí "Back squat" para confirmar'), 'Back');
      expect(borrar).toBeDisabled();

      await userEvent.type(screen.getByLabelText('Escribí "Back squat" para confirmar'), ' squat');
      expect(borrar).toBeEnabled();
      expect(api.client.deleteExercise).not.toHaveBeenCalled();
    });

    it('no distingue mayúsculas ni acentos, como el resto de los nombres', async () => {
      renderEdicion('mex_a1b2c3d4');
      await screen.findByLabelText('Nivel');

      await userEvent.type(
        screen.getByLabelText('Escribí "Back squat" para confirmar'),
        'back SQUAT',
      );

      expect(screen.getByRole('button', { name: 'Borrar ejercicio' })).toBeEnabled();
    });

    it('borra y la lista ya no lo muestra', async () => {
      // El recorrido real: Home tiene la lista en caché, así que si el borrado no la
      // invalida, el ejercicio seguiría apareciendo.
      const api = fakeApi(lista([delCatalogo]));
      api.client.deleteExercise.mockImplementation(() => {
        api.client.listExercises.mockResolvedValue(lista([]));
        return Promise.resolve();
      });
      const { router } = renderApp('/', fakeSession(braian).client, api.client);
      await screen.findByText('Back squat');

      await userEvent.click(screen.getByRole('link', { name: /Back squat/ }));
      await userEvent.click(await screen.findByRole('link', { name: 'Editar' }));
      await userEvent.type(
        await screen.findByLabelText('Escribí "Back squat" para confirmar'),
        'Back squat',
      );
      await userEvent.click(screen.getByRole('button', { name: 'Borrar ejercicio' }));

      await waitFor(() => {
        expect(api.client.deleteExercise).toHaveBeenCalledWith('mex_a1b2c3d4');
      });
      expect(await screen.findByText('Todavía no tenés ejercicios')).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/');
    });

    it('avisa que se lleva el historial: es irreversible', async () => {
      renderEdicion('mex_a1b2c3d4');
      await screen.findByLabelText('Nivel');

      expect(screen.getByText(/todas sus marcas/)).toBeInTheDocument();
    });
  });

  it('un ejercicio que no está lo dice en vez de mostrar un formulario vacío', async () => {
    renderEdicion('mex_00000000');

    expect(await screen.findByText('No encontramos ese ejercicio.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument();
  });

  it('sin violaciones de accesibilidad', async () => {
    renderEdicion('mex_z9y8x7w6');
    await screen.findByLabelText('Nombre');

    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
