import type { ExerciseList } from '@wasabi-cross/schemas';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/http.ts';
import { braian, fakeApi, fakeSession, renderApp, type FakeApi } from '../test/app.tsx';

function lista(exercises: ExerciseList['exercises'], usage?: Partial<ExerciseList['usage']>) {
  return {
    exercises,
    usage: {
      plan: 'free' as const,
      total: exercises.length,
      custom: 0,
      maxTotal: 10,
      maxCustom: 3,
      ...usage,
    },
  };
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

function fila(items: HTMLElement[], index: number): HTMLElement {
  const found = items[index];
  if (!found) {
    throw new Error(`No hay fila ${String(index)} en la lista`);
  }
  return found;
}

function renderHome(api: FakeApi) {
  return renderApp('/', fakeSession(braian).client, api.client);
}

describe('Home: lista de ejercicios (F1-11, mockup 4)', () => {
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

  describe('con ejercicios', () => {
    it('cada uno con su nombre, la fecha del valor actual y el valor con su unidad', async () => {
      renderHome(fakeApi(lista([backSquat, carrera])));

      const items = await screen.findAllByRole('listitem');
      expect(items).toHaveLength(2);
      const [squat, corrida] = [fila(items, 0), fila(items, 1)];

      expect(within(squat).getByText('Back squat')).toBeInTheDocument();
      expect(within(squat).getByText('RM del 23/06/2026')).toBeInTheDocument();
      expect(within(squat).getByText('100 kg')).toBeInTheDocument();

      // Un tiempo se lee como tiempo, no como 272 segundos.
      expect(within(corrida).getByText('4:32')).toBeInTheDocument();
      expect(within(corrida).getByText('Tiempo del 01/07/2026')).toBeInTheDocument();
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

  describe('cupo del plan (spec §4)', () => {
    it('en el límite, el botón queda deshabilitado y dice por qué', async () => {
      const diez = Array.from({ length: 10 }, (_, index) => ({
        ...backSquat,
        id: `mex_a1b2c3d${String(index)}`,
        name: `Ejercicio ${String(index)}`,
      }));

      renderHome(fakeApi(lista(diez)));

      expect(
        await screen.findByText('Alcanzaste el máximo de 10 de tu plan Free.'),
      ).toBeInTheDocument();
      const boton = screen.getByRole('button', { name: 'Nuevo ejercicio' });
      expect(boton).toBeDisabled();
      expect(screen.queryByRole('link', { name: 'Nuevo ejercicio' })).not.toBeInTheDocument();
    });

    it('sin límite (plan Max), el botón sigue habilitado', async () => {
      const api = fakeApi(
        lista([backSquat], { plan: 'max', total: 40, maxTotal: null, maxCustom: null }),
      );

      renderHome(api);

      expect(await screen.findByRole('link', { name: 'Nuevo ejercicio' })).toBeInTheDocument();
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
