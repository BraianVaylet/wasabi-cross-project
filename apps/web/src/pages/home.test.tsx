import type { ExerciseList } from '@wasabi-cross/schemas';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../lib/http.ts';
import { braian, fakeApi, fakeSession, fila, renderApp, type FakeApi } from '../test/app.tsx';

function lista(exercises: ExerciseList['exercises']): ExerciseList {
  return { exercises };
}

const backSquat = {
  id: 'mex_a1b2c3d4',
  exerciseId: 'exo_a1b2c3d4',
  name: 'Back squat',
  category: 'fuerza' as const,
  kind: 'rm' as const,
  isCustom: false,
  level: 'intermedio' as const,
  withPain: false,
  current: { value: 100, unit: 'kg' as const, performedAt: '2026-06-23T10:00:00.000Z' },
};

const carrera = {
  ...backSquat,
  id: 'mex_z9y8x7w6',
  exerciseId: 'exo_z9y8x7w6',
  name: 'Carrera 1 km',
  category: 'running' as const,
  kind: 'time' as const,
  current: { value: 272, unit: 's' as const, performedAt: '2026-07-01T10:00:00.000Z' },
};

const sled = {
  ...backSquat,
  id: 'mex_s1ed9x8y',
  exerciseId: 'exo_s1ed9x8y',
  name: 'Sled Push del garage',
  category: 'distancia_carga' as const,
  kind: 'weighted_distance' as const,
  current: {
    value: 50,
    unit: 'm' as const,
    weightKg: 152,
    performedAt: '2026-07-02T10:00:00.000Z',
  },
};

const remo = {
  ...backSquat,
  id: 'mex_r3m0e4r5',
  exerciseId: 'exo_r3m0e4r5',
  name: 'Remo del garage',
  category: 'cardio' as const,
  kind: 'distance' as const,
  current: {
    value: 2000,
    unit: 'm' as const,
    caloriesKcal: 120,
    performedAt: '2026-07-02T10:00:00.000Z',
  },
};

function renderHome(api: FakeApi) {
  return renderApp('/', fakeSession(braian).client, api.client);
}

describe('Home: lista de ejercicios (F1-11, mockup 4)', () => {
  describe('con ejercicios', () => {
    it('cada uno con su nombre, la fecha del valor actual y el valor con su unidad', async () => {
      renderHome(fakeApi(lista([backSquat, carrera])));

      const items = await screen.findAllByRole('listitem');
      expect(items).toHaveLength(2);
      const [squat, corrida] = [fila(items, 0), fila(items, 1)];

      expect(within(squat).getByText('Back squat')).toBeInTheDocument();
      expect(within(squat).getByText('RM del 23/06/2026')).toBeInTheDocument();
      expect(squat).toHaveTextContent('100 kg');

      // Un tiempo se lee como tiempo, no como 272 segundos.
      expect(corrida).toHaveTextContent('4:32');
      expect(within(corrida).getByText('Tiempo del 01/07/2026')).toBeInTheDocument();
    });

    it('uno de distancia con carga muestra los metros con su peso (F5-03b)', async () => {
      renderHome(fakeApi(lista([sled])));

      const [item] = await screen.findAllByRole('listitem');
      const fila0 = fila(item ? [item] : [], 0);
      expect(fila0).toHaveTextContent('50');
      expect(fila0).toHaveTextContent('con 152 kg');
      expect(within(fila0).getByText('Distancia del 02/07/2026')).toBeInTheDocument();
    });

    it('uno de cardio muestra los metros con sus calorías (F5-03a)', async () => {
      renderHome(fakeApi(lista([remo])));

      const [item] = await screen.findAllByRole('listitem');
      const fila0 = fila(item ? [item] : [], 0);
      expect(fila0).toHaveTextContent('2.000');
      expect(fila0).toHaveTextContent('120 kcal');
      expect(within(fila0).getByText('Distancia del 02/07/2026')).toBeInTheDocument();
    });

    it('cada ejercicio lleva a su detalle', async () => {
      const { router } = renderHome(fakeApi(lista([backSquat])));

      await userEvent.click(await screen.findByRole('link', { name: /Back squat/ }));

      expect(router.state.location.pathname).toBe('/ejercicios/mex_a1b2c3d4');
    });

    it('el botón lleva a agregar uno nuevo', async () => {
      const { router } = renderHome(fakeApi(lista([backSquat])));

      await userEvent.click(await screen.findByRole('link', { name: 'Nuevo ejercicio' }));

      expect(router.state.location.pathname).toBe('/ejercicios/nuevo');
    });

    it('sin violaciones de accesibilidad', async () => {
      renderHome(fakeApi(lista([backSquat, carrera])));
      await screen.findAllByRole('listitem');

      const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  });

  describe('estado vacío (spec §11)', () => {
    it('lo dice y ofrece agregar el primero', async () => {
      renderHome(fakeApi(lista([])));

      expect(await screen.findByText('Todavía no tenés ejercicios')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Agregar el primero' })).toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('mientras carga', () => {
    it('se ven skeletons, no un spinner', async () => {
      const api = fakeApi(lista([backSquat]));
      api.client.listExercises.mockReturnValue(new Promise(() => undefined));

      renderHome(api);

      const cargando = await screen.findByRole('status', { name: 'Cargando tus ejercicios' });
      expect(cargando.querySelectorAll('.wc-skeleton__piece').length).toBeGreaterThan(1);
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('sin tope de ejercicios (spec §4)', () => {
    it('con más de diez, "Nuevo ejercicio" sigue habilitado y no hay aviso de límite', async () => {
      const once = Array.from({ length: 11 }, (_, index) => ({
        ...backSquat,
        id: `mex_a1b2c3d${String(index).padStart(2, '0')}`,
        name: `Ejercicio ${String(index)}`,
      }));

      renderHome(fakeApi(lista(once)));

      expect(await screen.findByRole('link', { name: 'Nuevo ejercicio' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Nuevo ejercicio' })).not.toBeInTheDocument();
      expect(screen.queryByText(/máximo/)).not.toBeInTheDocument();
    });

    it('al lado del título dice cuántos ejercicios hay, sin un tope', async () => {
      renderHome(fakeApi(lista([backSquat, carrera])));

      await screen.findAllByRole('listitem');

      expect(screen.getByText('02')).toBeInTheDocument();
      expect(screen.getByText('2 ejercicios')).toBeInTheDocument();
      expect(screen.queryByText(/de tu plan/)).not.toBeInTheDocument();
    });

    it('con uno solo, el lector de pantalla lo dice en singular', async () => {
      renderHome(fakeApi(lista([backSquat])));

      expect(await screen.findByText('1 ejercicio')).toBeInTheDocument();
    });
  });

  describe('si la lista no llega', () => {
    it('reintenta sola y, si sigue sin llegar, muestra el error con su código', async () => {
      const api = fakeApi(lista([backSquat]));
      api.client.listExercises.mockRejectedValue(
        new ApiError(0, 'WC-SYS-503-004', 'No pudimos conectarnos.', 'req-5'),
      );

      renderHome(api);

      const alert = await screen.findByRole('alert', undefined, { timeout: 8000 });
      expect(alert).toHaveTextContent('WC-SYS-503-004');
      expect(alert).toHaveTextContent('req-5');
      // Sin red no se rinde al primer intento.
      expect(api.client.listExercises.mock.calls.length).toBeGreaterThan(1);

      api.client.listExercises.mockResolvedValue(lista([backSquat]));
      await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

      expect(await screen.findByText('Back squat')).toBeInTheDocument();
    }, 15_000);
  });
});
