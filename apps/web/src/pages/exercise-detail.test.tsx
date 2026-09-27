import type { ExerciseList, ExerciseStats, ManagedExerciseSummary } from '@wasabi-cross/schemas';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
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

describe('Detalle de ejercicio (spec §5.2, docs/design)', () => {
  describe('la cabecera', () => {
    it('nombre, valor actual con su fecha, y categoría, nivel y dolor en sus líneas', async () => {
      renderDetalle('/ejercicios/mex_a1b2c3d4');

      expect(await screen.findByRole('heading', { name: 'Back squat' })).toBeInTheDocument();
      expect(screen.getByText('Registrado el 23/06/2026')).toBeInTheDocument();
      expect(screen.getByTestId('valor-actual')).toHaveTextContent('100 kg');
      expect(screen.getByText('RM actual')).toBeInTheDocument();
      expect(screen.getByText('RM vigente')).toBeInTheDocument();
      expect(screen.getByText('Fuerza')).toBeInTheDocument();
      expect(screen.getByText('Principiante')).toBeInTheDocument();
      expect(screen.getByText('Con dolor')).toBeInTheDocument();
    });

    it('vuelve a la lista desde arriba: instalada en iOS no hay botón atrás', async () => {
      renderDetalle('/ejercicios/mex_a1b2c3d4');

      const volver = await screen.findByRole('link', { name: 'Ejercicios' });
      expect(volver).toHaveAttribute('href', '/');
    });

    it('el lápiz lleva a editar el ejercicio', async () => {
      renderDetalle('/ejercicios/mex_a1b2c3d4');

      const editar = await screen.findByRole('link', { name: 'Editar' });
      expect(editar).toHaveAttribute('href', '/ejercicios/mex_a1b2c3d4/editar');
    });

    it('lo que no se mide en RM habla de marca, no de RM', async () => {
      renderDetalle('/ejercicios/mex_z9y8x7w6');

      await screen.findByRole('heading', { name: 'Carrera 1 km' });
      expect(screen.getByText('Marca actual')).toBeInTheDocument();
      expect(screen.getByText('Marca vigente')).toBeInTheDocument();
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

      expect(await screen.findByTestId('valor-actual')).toHaveTextContent('12 reps');
      expect(screen.getByText('con 30 kg')).toBeInTheDocument();
    });

    it('en running, el valor actual suma el desnivel al tiempo', async () => {
      renderDetalle('/ejercicios/mex_z9y8x7w6', [
        { ...carrera, current: { ...carrera.current, elevationGainM: 150 } },
      ]);

      expect(await screen.findByTestId('valor-actual')).toHaveTextContent('4:32');
      expect(screen.getByText('desnivel 150 m')).toBeInTheDocument();
    });
  });

  describe('elegí tu carga (spec §5.1)', () => {
    it('muestra los porcentajes del perfil con su carga', async () => {
      renderDetalle('/ejercicios/mex_a1b2c3d4');

      expect(await screen.findByRole('heading', { name: 'Elegí tu carga' })).toBeInTheDocument();
      const tabla = screen.getByRole('group', { name: 'Porcentaje del RM' });
      const opciones = within(tabla).getAllByRole('radio');

      expect(opciones).toHaveLength(6);
      expect(within(tabla).getByRole('radio', { name: '65% · 65 kg' })).toBeInTheDocument();
      expect(within(tabla).getByRole('radio', { name: '95% · 95 kg' })).toBeInTheDocument();
    });

    it('arranca en el primero y muestra la carga y la banda, en verde', async () => {
      renderDetalle('/ejercicios/mex_a1b2c3d4');

      expect(await screen.findByTestId('carga')).toHaveTextContent('65 kg');
      expect(screen.getByText('Carga liviana')).toHaveClass('wc-tag--success');
    });

    it('elegir otro cambia la carga y la banda, y queda en la URL — pesada, en rojo', async () => {
      const { router } = renderDetalle('/ejercicios/mex_a1b2c3d4');
      await screen.findByTestId('carga');

      await userEvent.click(screen.getByRole('radio', { name: '85% · 85 kg' }));

      expect(screen.getByTestId('carga')).toHaveTextContent('85 kg');
      expect(screen.getByText('Carga pesada')).toHaveClass('wc-tag--danger');
      expect(router.state.location.search).toEqual({ pct: 85 });
    });

    it('un link con ?pct=80 arranca con ese porcentaje elegido — media, en ámbar', async () => {
      renderDetalle('/ejercicios/mex_a1b2c3d4?pct=80');

      expect(await screen.findByTestId('carga')).toHaveTextContent('80 kg');
      expect(screen.getByText('Carga media')).toHaveClass('wc-tag--warning');
      expect(screen.getByRole('radio', { name: '80% · 80 kg' })).toBeChecked();
    });

    it('un porcentaje custom se calcula al tipear, sin llamar a la API', async () => {
      const { api } = renderDetalle('/ejercicios/mex_a1b2c3d4');
      await screen.findByTestId('carga');
      const llamadas = api.client.listExercises.mock.calls.length;

      await userEvent.type(screen.getByLabelText('Porcentaje personalizado'), '98');

      expect(screen.getByTestId('carga')).toHaveTextContent('98 kg');
      expect(api.client.listExercises.mock.calls.length).toBe(llamadas);
      expect(api.client.savePreferences).not.toHaveBeenCalled();
      // 98 no está en la grilla: ningún casillero queda elegido, como en el diseño.
      for (const opcion of screen.getAllByRole('radio')) {
        expect(opcion).not.toBeChecked();
      }
    });

    it('un porcentaje custom fuera de rango lo dice y deja la última carga válida', async () => {
      renderDetalle('/ejercicios/mex_a1b2c3d4');
      await screen.findByTestId('carga');

      // Tipeando "120" se pasa por 1 y por 12, que sí valen: la carga los va siguiendo.
      await userEvent.type(screen.getByLabelText('Porcentaje personalizado'), '120');

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
      expect(screen.getByRole('heading', { name: 'Elegí tus reps' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Porcentaje del máximo' })).toBeInTheDocument();
    });

    it('en tiempo no hay tabla: menos es mejor, no hay porcentaje que valga', async () => {
      renderDetalle('/ejercicios/mex_z9y8x7w6');

      await screen.findByRole('heading', { name: 'Carrera 1 km' });
      expect(screen.queryByRole('group', { name: /Porcentaje/ })).not.toBeInTheDocument();
      expect(screen.getByText(/no tienen tabla de porcentajes/)).toBeInTheDocument();
    });
  });

  describe('el progreso (spec §5.2, zona 4)', () => {
    const progreso: ExerciseStats = {
      id: 'mex_a1b2c3d4',
      name: 'Back squat',
      kind: 'rm',
      unit: 'kg',
      period: 'todo',
      series: [
        { performedAt: '2025-06-02T12:00:00.000Z', value: 60 },
        { performedAt: '2026-02-23T12:00:00.000Z', value: 80 },
        { performedAt: '2026-06-23T12:00:00.000Z', value: 100 },
      ],
      summary: { current: 100, best: 100, worst: 60, changePercent: 66.7, records: 3 },
    };

    it('pide todo el historial y muestra el aumento desde la primera marca', async () => {
      const { api } = renderDetalle('/ejercicios/mex_a1b2c3d4');
      api.client.exerciseStats.mockResolvedValue(progreso);

      expect(await screen.findByRole('heading', { name: 'Progreso del RM' })).toBeInTheDocument();
      expect(api.client.exerciseStats).toHaveBeenCalledWith('mex_a1b2c3d4', 'todo');
      expect(await screen.findByTestId('aumento')).toHaveTextContent('Aumento+40 kg');
      expect(screen.getByRole('figure', { name: 'RM registrado' })).toBeInTheDocument();
    });

    it('en tiempo, bajar es mejorar: de 4:40 a 4:32 es una mejora de 8 segundos', async () => {
      const { api } = renderDetalle('/ejercicios/mex_z9y8x7w6');
      api.client.exerciseStats.mockResolvedValue({
        ...progreso,
        id: 'mex_z9y8x7w6',
        name: 'Carrera 1 km',
        kind: 'time',
        unit: 's',
        series: [
          { performedAt: '2026-01-10T12:00:00.000Z', value: 280 },
          { performedAt: '2026-07-01T12:00:00.000Z', value: 272 },
        ],
      });

      expect(await screen.findByTestId('aumento')).toHaveTextContent('Mejora+8 s');
    });

    it('con una sola marca no hay aumento que mostrar', async () => {
      renderDetalle('/ejercicios/mex_a1b2c3d4');

      await screen.findByRole('heading', { name: 'Progreso del RM' });
      expect(screen.queryByTestId('aumento')).not.toBeInTheDocument();
    });

    it('"Ver estadísticas" lleva a Estadísticas con este ejercicio abierto', async () => {
      renderDetalle('/ejercicios/mex_a1b2c3d4');

      const link = await screen.findByRole('link', { name: 'Ver estadísticas' });
      expect(link).toHaveAttribute('href', '/estadisticas?abierto=mex_a1b2c3d4');
    });
  });

  describe('la barra fija (spec §5.2, zona 6)', () => {
    it('dice de qué sale la carga, la carga en grande, su banda y cómo registrar', async () => {
      renderDetalle('/ejercicios/mex_a1b2c3d4');

      const barra = await screen.findByRole('region', { name: 'Carga seleccionada' });
      expect(within(barra).getByText('65% de 100 kg')).toBeInTheDocument();
      expect(within(barra).getByTestId('carga')).toHaveTextContent('65 kg');
      expect(within(barra).getByText('Carga liviana')).toBeInTheDocument();
      expect(within(barra).getByRole('button', { name: 'Registrar nuevo RM' })).toBeEnabled();
    });

    it('el botón abre el modal de siempre', async () => {
      renderDetalle('/ejercicios/mex_a1b2c3d4');

      await userEvent.click(await screen.findByRole('button', { name: 'Registrar nuevo RM' }));

      expect(await screen.findByRole('dialog', { name: 'Nuevo RM' })).toBeInTheDocument();
    });

    it('en tiempo no hay carga que calcular: muestra la mejor marca', async () => {
      renderDetalle('/ejercicios/mex_z9y8x7w6');

      const barra = await screen.findByRole('region', { name: 'Mejor marca' });
      expect(within(barra).getByRole('button', { name: 'Registrar nueva marca' })).toBeEnabled();
      expect(screen.queryByTestId('carga')).not.toBeInTheDocument();
    });
  });

  it('sin violaciones de accesibilidad', async () => {
    renderDetalle('/ejercicios/mex_a1b2c3d4');
    await screen.findByTestId('carga');

    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
