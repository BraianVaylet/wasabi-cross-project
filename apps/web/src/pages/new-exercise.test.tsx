import type { Exercise, ManagedExerciseSummary } from '@wasabi-cross/schemas';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../lib/http.ts';
import { braian, fakeApi, fakeSession, renderApp, type FakeApi } from '../test/app.tsx';

function delCatalogo(name: string, category: Exercise['category'], id: string): Exercise {
  return {
    id,
    ownerId: null,
    name,
    category,
    capacities: ['fuerza'],
    primaryMuscleGroup: 'cuadriceps',
    muscleGroups: ['cuadriceps', 'gluteo'],
    bodySegment: 'tren_inferior',
    disciplines: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

/** Lo que responde el alta: el ejercicio ya en la lista del usuario. */
const BACK_SQUAT_GESTIONADO: ManagedExerciseSummary = {
  id: 'mex_a1b2c3d4',
  exerciseId: 'exo_a1b2c3d4',
  name: 'Back squat',
  category: 'fuerza',
  kind: 'rm',
  isCustom: false,
  level: 'intermedio',
  withPain: false,
  current: { value: 100, unit: 'kg', performedAt: '2026-06-23T12:00:00.000Z' },
};

const CATALOGO = [
  delCatalogo('Back squat', 'fuerza', 'exo_a1b2c3d4'),
  delCatalogo('Carrera 1 km', 'running', 'exo_z9y8x7w6'),
];

function renderNuevo(api: FakeApi = fakeApi(), path = '/ejercicios/nuevo?modo=crear') {
  api.client.catalog.mockResolvedValue(CATALOGO);
  return { api, ...renderApp(path, fakeSession(braian).client, api.client) };
}

async function completarComun(): Promise<void> {
  await userEvent.selectOptions(screen.getByLabelText('Nivel'), 'intermedio');
}

describe('Nuevo ejercicio (F1-12, mockup 9)', () => {
  describe('el nombre busca en el catálogo', () => {
    it('se busca con el teclado: el campo ofrece las opciones del catálogo', async () => {
      renderNuevo();
      const nombre = await screen.findByLabelText('Nombre');

      const listId = nombre.getAttribute('list') ?? '';
      expect(listId).not.toBe('');

      await waitFor(() => {
        const opciones = [...(document.getElementById(listId)?.children ?? [])].map((option) =>
          option.getAttribute('value'),
        );
        expect(opciones).toEqual(['Back squat', 'Carrera 1 km']);
      });
    });

    it('con un nombre del catálogo, la categoría queda fija y no se puede cambiar', async () => {
      renderNuevo();

      await userEvent.type(await screen.findByLabelText('Nombre'), 'Back squat');

      expect(screen.getByText('Fuerza (RM en kg)')).toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Categoría' })).not.toBeInTheDocument();
      expect(screen.getByLabelText('RM (kg)')).toBeInTheDocument();
    });

    it('con un nombre que no está, pide la categoría', async () => {
      renderNuevo();

      await userEvent.type(await screen.findByLabelText('Nombre'), 'Wall ball');

      expect(screen.getByRole('group', { name: 'Categoría' })).toBeInTheDocument();
    });

    it('cardio se puede elegir, y pide los metros y las calorías (F5-03a)', async () => {
      renderNuevo();

      await userEvent.type(await screen.findByLabelText('Nombre'), 'Remo del garage');
      await userEvent.click(screen.getByRole('radio', { name: 'Cardio (metros y calorías)' }));

      expect(screen.getByLabelText('Distancia (m)')).toBeInTheDocument();
      expect(screen.getByLabelText('Calorías (kcal)')).toBeInTheDocument();
    });
  });

  describe('guardar', () => {
    it('uno del catálogo viaja por su ID', async () => {
      const { api, router } = renderNuevo();

      await userEvent.type(await screen.findByLabelText('Nombre'), 'Back squat');
      await userEvent.type(screen.getByLabelText('RM (kg)'), '100');
      await userEvent.type(screen.getByLabelText('Fecha'), '2026-06-23');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      expect(api.client.addExercise).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'catalog',
          exerciseId: 'exo_a1b2c3d4',
          level: 'intermedio',
          withPain: false,
        }),
      );
      // Al guardar, vuelve a la lista.
      expect(await screen.findByRole('heading', { name: 'Tus ejercicios' })).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/');
    });

    it('uno propio viaja con su nombre, su categoría y lo que entrena', async () => {
      const { api } = renderNuevo();

      await userEvent.type(await screen.findByLabelText('Nombre'), 'Wall ball');
      await userEvent.click(screen.getByRole('radio', { name: 'Gimnástico (repeticiones)' }));
      await userEvent.click(screen.getByRole('checkbox', { name: 'Fuerza' }));
      await userEvent.click(screen.getByRole('checkbox', { name: 'Hombro' }));
      await userEvent.type(screen.getByLabelText('Repeticiones'), '30');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      expect(api.client.addExercise).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'custom',
          name: 'Wall ball',
          category: 'gimnastico',
          capacities: ['fuerza'],
          primaryMuscleGroup: 'hombro',
          secondaryMuscleGroups: [],
        }),
      );
    });

    it('uno propio sin capacidades ni grupos no se guarda (F2-03, spec §5.1)', async () => {
      const { api } = renderNuevo();

      await userEvent.type(await screen.findByLabelText('Nombre'), 'Wall ball');
      await userEvent.click(screen.getByRole('radio', { name: 'Gimnástico (repeticiones)' }));
      await userEvent.type(screen.getByLabelText('Repeticiones'), '30');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      expect(await screen.findByText('Elegí al menos una capacidad')).toBeInTheDocument();
      expect(screen.getByText('Elegí al menos un grupo muscular')).toBeInTheDocument();
      expect(api.client.addExercise).not.toHaveBeenCalled();
    });

    it('uno del catálogo no los pregunta: ya los tiene', async () => {
      renderNuevo();

      await userEvent.type(await screen.findByLabelText('Nombre'), 'Back squat');

      expect(screen.queryByRole('group', { name: 'Capacidades' })).not.toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Grupos musculares' })).not.toBeInTheDocument();
    });

    it('un tiempo se escribe mm:ss y se guarda en segundos', async () => {
      const { api } = renderNuevo();

      await userEvent.type(await screen.findByLabelText('Nombre'), 'Carrera 1 km');
      // El input inserta los ":" solo, cada dos cifras: "0432" queda "04:32".
      await userEvent.type(screen.getByLabelText('Tiempo (mm:ss)'), '0432');
      await userEvent.type(screen.getByLabelText('Desnivel (m)'), '150');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      const [input] = api.client.addExercise.mock.calls[0] ?? [];
      expect(input?.firstRecord.value).toBe(272);
      expect(input?.firstRecord.elevationGainM).toBe(150);
    });

    it('un tiempo mal escrito se frena en el formulario', async () => {
      const { api } = renderNuevo();

      await userEvent.type(await screen.findByLabelText('Nombre'), 'Carrera 1 km');
      // "0299" queda "02:99": 99 segundos no es un tiempo válido.
      await userEvent.type(screen.getByLabelText('Tiempo (mm:ss)'), '0299');
      await userEvent.type(screen.getByLabelText('Desnivel (m)'), '150');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Escribilo como mm:ss, por ejemplo 4:32',
      );
      expect(api.client.addExercise).not.toHaveBeenCalled();
    });

    it('running sin desnivel se frena en el formulario', async () => {
      const { api } = renderNuevo();

      await userEvent.type(await screen.findByLabelText('Nombre'), 'Carrera 1 km');
      await userEvent.type(screen.getByLabelText('Tiempo (mm:ss)'), '0432');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Cargá el desnivel, como 150 (0 si es plano)',
      );
      expect(api.client.addExercise).not.toHaveBeenCalled();
    });

    it('sin nivel, el error lo dice en es-AR y no lo escupe Zod en inglés', async () => {
      const { api } = renderNuevo();

      await userEvent.type(await screen.findByLabelText('Nombre'), 'Back squat');
      await userEvent.type(screen.getByLabelText('RM (kg)'), '100');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Elegí tu nivel');
      expect(api.client.addExercise).not.toHaveBeenCalled();
    });

    it('después de guardar, Home ya muestra el ejercicio nuevo', async () => {
      // El recorrido real: Home vacío, agregar, y volver. Home tiene la lista en caché,
      // así que si el alta no la invalida, el ejercicio nuevo no aparecería.
      const api = fakeApi();
      api.client.catalog.mockResolvedValue(CATALOGO);
      renderApp('/', fakeSession(braian).client, api.client);
      await screen.findByText('Todavía no tenés ejercicios');

      api.client.addExercise.mockImplementation(() => {
        api.client.listExercises.mockResolvedValue({
          exercises: [BACK_SQUAT_GESTIONADO],
          usage: { plan: 'free', total: 1, custom: 0, maxTotal: 10, maxCustom: 3 },
        });
        return Promise.resolve(BACK_SQUAT_GESTIONADO);
      });

      await userEvent.click(screen.getByRole('link', { name: 'Agregar el primero' }));
      // Se entra por el catálogo: se elige de la lista y el formulario ya trae el nombre.
      await userEvent.click(await screen.findByRole('button', { name: /Back squat/ }));
      await userEvent.type(screen.getByLabelText('RM (kg)'), '100');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      expect(await screen.findByText('Back squat')).toBeInTheDocument();
    });
  });

  describe('errores de la API', () => {
    it('el límite del plan se explica, no se muestra un error genérico', async () => {
      const { api } = renderNuevo();
      api.client.addExercise.mockRejectedValueOnce(
        new ApiError(
          403,
          'WC-SUBS-403-001',
          'Alcanzaste el máximo de 10 de tu plan Free.',
          'req-1',
        ),
      );

      await userEvent.type(await screen.findByLabelText('Nombre'), 'Back squat');
      await userEvent.type(screen.getByLabelText('RM (kg)'), '100');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Alcanzaste el máximo de 10 de tu plan Free.',
      );
    });

    it('un ejercicio repetido lo dice con el mensaje de la API', async () => {
      const { api } = renderNuevo();
      api.client.addExercise.mockRejectedValueOnce(
        new ApiError(409, 'WC-EXO-409-003', 'Ya tenés ese ejercicio en tu lista.', 'req-2'),
      );

      await userEvent.type(await screen.findByLabelText('Nombre'), 'Back squat');
      await userEvent.type(screen.getByLabelText('RM (kg)'), '100');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Ya tenés ese ejercicio en tu lista.',
      );
    });
  });

  describe('la pestaña Catálogo (F5-10)', () => {
    it('se abre por el catálogo y lista los precargados con su categoría, grupo y equipo', async () => {
      renderNuevo(fakeApi(), '/ejercicios/nuevo');

      expect(await screen.findByRole('tab', { name: 'Catálogo', selected: true })).toBeVisible();
      const backSquat = await screen.findByRole('button', { name: /Back squat/ });
      expect(backSquat).toHaveTextContent('Fuerza · Cuádriceps');
      expect(screen.getByRole('button', { name: /Carrera 1 km/ })).toHaveTextContent('Running');
    });

    it('el buscador filtra sin distinguir mayúsculas ni acentos', async () => {
      renderNuevo(fakeApi(), '/ejercicios/nuevo');
      await screen.findByRole('button', { name: /Back squat/ });

      await userEvent.type(screen.getByLabelText('Buscar en el catálogo'), 'CARRERA');

      expect(screen.queryByRole('button', { name: /Back squat/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Carrera 1 km/ })).toBeInTheDocument();
    });

    it('sin coincidencias, lo dice y manda a crearlo', async () => {
      renderNuevo(fakeApi(), '/ejercicios/nuevo');
      await screen.findByRole('button', { name: /Back squat/ });

      await userEvent.type(screen.getByLabelText('Buscar en el catálogo'), 'zzz');

      expect(await screen.findByRole('status')).toHaveTextContent('Ningún ejercicio');
    });

    it('elegir uno pasa a "Crear" con el nombre cargado y la categoría fija', async () => {
      const { router } = renderNuevo(fakeApi(), '/ejercicios/nuevo');

      await userEvent.click(await screen.findByRole('button', { name: /Back squat/ }));

      expect(await screen.findByLabelText('Nombre')).toHaveValue('Back squat');
      expect(screen.getByLabelText('RM (kg)')).toBeInTheDocument();
      expect(router.state.location.search).toEqual({ modo: 'crear' });
    });

    it('los que ya están en la lista se ven, pero no se pueden elegir', async () => {
      const api = fakeApi({
        exercises: [BACK_SQUAT_GESTIONADO],
        usage: { plan: 'free', total: 1, custom: 0, maxTotal: 10, maxCustom: 3 },
      });
      renderNuevo(api, '/ejercicios/nuevo');

      expect(await screen.findByText('Ya lo tenés en tu lista')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Back squat/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Carrera 1 km/ })).toBeInTheDocument();
    });

    it('cambiar de pestaña con el navegador vuelve al catálogo', async () => {
      const { router } = renderNuevo(fakeApi(), '/ejercicios/nuevo');
      await userEvent.click(await screen.findByRole('button', { name: /Back squat/ }));
      await screen.findByLabelText('Nombre');

      router.history.back();

      expect(await screen.findByRole('tab', { name: 'Catálogo', selected: true })).toBeVisible();
    });

    it('sin violaciones de accesibilidad', async () => {
      renderNuevo(fakeApi(), '/ejercicios/nuevo');
      await screen.findByRole('button', { name: /Back squat/ });

      const results = await axe.run(document.body);

      expect(results.violations).toEqual([]);
    });
  });

  it('se puede volver a la lista sin guardar', async () => {
    const { router } = renderNuevo();

    await userEvent.click(await screen.findByRole('link', { name: 'Ejercicios' }));

    expect(router.state.location.pathname).toBe('/');
  });

  it('sin violaciones de accesibilidad', async () => {
    renderNuevo();
    await screen.findByLabelText('Nombre');
    await userEvent.type(screen.getByLabelText('Nombre'), 'Wall ball');

    const results = await axe.run(document.body, { rules: { region: { enabled: false } } });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
