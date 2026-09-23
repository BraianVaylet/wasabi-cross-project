import type { ExerciseList, ManagedExerciseSummary } from '@wasabi-cross/schemas';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { braian, fakeApi, fakeSession, renderApp } from '../test/app.tsx';

const backSquat: ManagedExerciseSummary = {
  id: 'mex_a1b2c3d4',
  exerciseId: 'exo_a1b2c3d4',
  name: 'Back squat',
  category: 'fuerza',
  kind: 'rm',
  isCustom: false,
  level: 'principiante',
  withPain: true,
  current: { value: 100, unit: 'kg', performedAt: '2026-06-23T12:00:00.000Z' },
};

const carrera: ManagedExerciseSummary = {
  ...backSquat,
  id: 'mex_z9y8x7w6',
  name: 'Carrera 1 km',
  category: 'running',
  kind: 'time',
  withPain: false,
  level: 'avanzado',
  current: { value: 272, unit: 's', performedAt: '2026-07-01T12:00:00.000Z' },
};

function lista(exercises: ManagedExerciseSummary[]): ExerciseList {
  return {
    exercises,
    usage: { plan: 'free', total: exercises.length, custom: 0, maxTotal: 10, maxCustom: 3 },
  };
}

function renderDetalle(url: string, exercises = [backSquat, carrera]) {
  const api = fakeApi(lista(exercises));
  const app = renderApp(url, fakeSession(braian).client, api.client);
  return { api, ...app };
}

describe('Detalle de ejercicio: porcentajes (F1-13, mockups 5 y 6)', () => {
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

  describe('lo que se ve del ejercicio', () => {
    it('nombre, valor actual con su fecha y tags', async () => {
      renderDetalle('/ejercicios/mex_a1b2c3d4');

      expect(await screen.findByRole('heading', { name: 'Back squat' })).toBeInTheDocument();
      expect(screen.getByText('RM del 23/06/2026')).toBeInTheDocument();
      expect(screen.getByText('100 kg')).toBeInTheDocument();
      expect(screen.getByText('Fuerza')).toBeInTheDocument();
      expect(screen.getByText('Principiante')).toBeInTheDocument();
      expect(screen.getByText('Con dolor')).toBeInTheDocument();
    });

    it('sin "con dolor", no se inventa el tag', async () => {
      renderDetalle('/ejercicios/mex_z9y8x7w6');

      await screen.findByRole('heading', { name: 'Carrera 1 km' });
      expect(screen.queryByText('Con dolor')).not.toBeInTheDocument();
    });

    it('un ejercicio que no está en la lista lo dice, con un camino de vuelta', async () => {
      renderDetalle('/ejercicios/mex_00000000');

      expect(await screen.findByText('No encontramos ese ejercicio.')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Volver a tus ejercicios' })).toBeInTheDocument();
    });

    it('en hipertrofia, el valor actual suma el peso a las repeticiones', async () => {
      const butterfly: ManagedExerciseSummary = {
        ...backSquat,
        id: 'mex_h1p2e3r4',
        name: 'Butterfly',
        category: 'hipertrofia',
        kind: 'weighted_reps',
        current: { value: 12, unit: 'reps', weightKg: 30, performedAt: '2026-06-23T12:00:00.000Z' },
      };
      renderDetalle('/ejercicios/mex_h1p2e3r4', [butterfly]);

      expect(await screen.findByText('12 reps · 30 kg')).toBeInTheDocument();
    });

    it('en running, el valor actual suma el desnivel al tiempo', async () => {
      renderDetalle('/ejercicios/mex_z9y8x7w6', [
        { ...carrera, current: { ...carrera.current, elevationGainM: 150 } },
      ]);

      expect(await screen.findByText('4:32 · 150 m')).toBeInTheDocument();
    });
  });

  describe('tabla de porcentajes (spec §5.1)', () => {
    it('muestra los porcentajes del perfil con su carga', async () => {
      renderDetalle('/ejercicios/mex_a1b2c3d4');

      const tabla = await screen.findByRole('group', { name: 'Porcentajes' });
      const opciones = within(tabla).getAllByRole('radio');

      expect(opciones).toHaveLength(6);
      expect(within(tabla).getByRole('radio', { name: '65% · 65 kg' })).toBeInTheDocument();
      expect(within(tabla).getByRole('radio', { name: '95% · 95 kg' })).toBeInTheDocument();
    });

    it('arranca en el primero y muestra la carga y la banda', async () => {
      renderDetalle('/ejercicios/mex_a1b2c3d4');

      expect(await screen.findByTestId('carga')).toHaveTextContent('65 kg');
      expect(screen.getByText('Carga liviana')).toBeInTheDocument();
    });

    it('elegir otro cambia la carga y la banda, y queda en la URL', async () => {
      const { router } = renderDetalle('/ejercicios/mex_a1b2c3d4');
      await screen.findByTestId('carga');

      await userEvent.click(screen.getByRole('radio', { name: '85% · 85 kg' }));

      expect(screen.getByTestId('carga')).toHaveTextContent('85 kg');
      expect(screen.getByText('Carga pesada')).toBeInTheDocument();
      expect(router.state.location.search).toEqual({ pct: 85 });
    });

    it('un link con ?pct=80 arranca con ese porcentaje elegido', async () => {
      renderDetalle('/ejercicios/mex_a1b2c3d4?pct=80');

      expect(await screen.findByTestId('carga')).toHaveTextContent('80 kg');
      expect(screen.getByText('Carga media')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: '80% · 80 kg' })).toBeChecked();
    });

    it('un porcentaje custom se calcula al tipear, sin llamar a la API', async () => {
      const { api } = renderDetalle('/ejercicios/mex_a1b2c3d4');
      await screen.findByTestId('carga');
      const llamadas = api.client.listExercises.mock.calls.length;

      await userEvent.type(screen.getByLabelText('Porcentaje custom'), '98');

      expect(screen.getByTestId('carga')).toHaveTextContent('98 kg');
      expect(api.client.listExercises.mock.calls.length).toBe(llamadas);
      expect(api.client.savePreferences).not.toHaveBeenCalled();
    });

    it('un porcentaje custom fuera de rango lo dice y deja la última carga válida', async () => {
      renderDetalle('/ejercicios/mex_a1b2c3d4');
      await screen.findByTestId('carga');

      // Tipeando "120" se pasa por 1 y por 12, que sí valen: la carga los va siguiendo.
      await userEvent.type(screen.getByLabelText('Porcentaje custom'), '120');

      expect(await screen.findByText('El porcentaje máximo es 100')).toBeInTheDocument();
      expect(screen.getByTestId('carga')).toHaveTextContent('12 kg');
    });

    it('en repeticiones, la tabla da repeticiones y no kilos', async () => {
      const dominadas: ManagedExerciseSummary = {
        ...backSquat,
        id: 'mex_11111111',
        name: 'Dominadas estrictas',
        category: 'gimnastico',
        kind: 'reps',
        current: { value: 20, unit: 'reps', performedAt: '2026-06-23T12:00:00.000Z' },
      };
      renderDetalle('/ejercicios/mex_11111111', [dominadas]);

      expect(await screen.findByTestId('carga')).toHaveTextContent('13 reps');
    });

    it('en tiempo no hay tabla: menos es mejor, no hay porcentaje que valga', async () => {
      renderDetalle('/ejercicios/mex_z9y8x7w6');

      await screen.findByRole('heading', { name: 'Carrera 1 km' });
      expect(screen.queryByRole('group', { name: 'Porcentajes' })).not.toBeInTheDocument();
      expect(screen.getByText(/no tienen tabla de porcentajes/)).toBeInTheDocument();
    });
  });

  it('sin violaciones de accesibilidad', async () => {
    renderDetalle('/ejercicios/mex_a1b2c3d4');
    await screen.findByTestId('carga');

    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
