import type { CatalogEntry, ManagedExerciseSummary } from '@wasabi-cross/schemas';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../lib/http.ts';
import { braian, fakeApi, fakeSession, renderApp, type FakeApi } from '../test/app.tsx';

const ESTAMPAS = {
  ownerId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as const;

const SENTADILLA: CatalogEntry = {
  ...ESTAMPAS,
  id: 'exo_a1b2c3d4',
  catalogKey: 'back-squat',
  name: 'Sentadilla trasera',
  category: 'fuerza',
  capacities: ['fuerza'],
  primaryMuscleGroup: 'cuadriceps',
  muscleGroups: ['cuadriceps', 'gluteo', 'core'],
  bodySegment: 'tren_inferior',
  disciplines: ['musculacion'],
  equipment: 'barra',
  alreadyAdded: false,
};

const CARRERA: CatalogEntry = {
  ...ESTAMPAS,
  id: 'exo_z9y8x7w6',
  catalogKey: 'carrera-1km',
  name: 'Carrera 1 km',
  category: 'running',
  capacities: ['resistencia'],
  primaryMuscleGroup: 'cuadriceps',
  muscleGroups: ['cuadriceps'],
  bodySegment: 'tren_inferior',
  disciplines: ['running'],
  equipment: 'sin_equipo',
  alreadyAdded: false,
};

const WALL_BALL: CatalogEntry = {
  ...ESTAMPAS,
  id: 'exo_w4l1b4l1',
  catalogKey: 'wall-ball',
  name: 'Wall Ball',
  category: 'gimnastico',
  capacities: ['resistencia'],
  primaryMuscleGroup: 'cuerpo_completo',
  muscleGroups: ['cuerpo_completo', 'cuadriceps', 'hombro'],
  bodySegment: 'cuerpo_completo',
  disciplines: ['crossfit', 'hyrox'],
  equipment: 'balon_medicinal',
  alreadyAdded: false,
};

/** Lo que responde el alta: el ejercicio ya en la lista del usuario. */
const SENTADILLA_GESTIONADA: ManagedExerciseSummary = {
  id: 'mex_a1b2c3d4',
  exerciseId: 'exo_a1b2c3d4',
  name: 'Sentadilla trasera',
  category: 'fuerza',
  kind: 'rm',
  isCustom: false,
  level: 'intermedio',
  withPain: false,
  current: { value: 100, unit: 'kg', performedAt: '2026-06-23T12:00:00.000Z' },
};

const CATALOGO = [SENTADILLA, CARRERA, WALL_BALL];

const PLAN_FREE = { plan: 'free', total: 0, custom: 0, maxTotal: 10, maxCustom: 3 } as const;

function renderNuevo(
  api: FakeApi = fakeApi(),
  path = '/ejercicios/nuevo?modo=crear',
  catalogo: CatalogEntry[] = CATALOGO,
) {
  api.client.catalog.mockResolvedValue(catalogo);
  return { api, ...renderApp(path, fakeSession(braian).client, api.client) };
}

/** Entra por la pestaña Catálogo y elige uno: el formulario queda con su definición. */
async function elegir(nombre: RegExp, api?: FakeApi) {
  const app = renderNuevo(api, '/ejercicios/nuevo');
  await userEvent.click(await screen.findByRole('button', { name: nombre }));
  await screen.findByLabelText('Nombre');
  return app;
}

async function completarComun(): Promise<void> {
  await userEvent.selectOptions(screen.getByLabelText('Nivel'), 'intermedio');
}

const grupo = (nombre: string) => within(screen.getByRole('group', { name: nombre }));

/** Un ejercicio propio: nombre, categoría, una capacidad y el grupo primario. */
async function completarPropio(categoria: string, primario = 'Hombro'): Promise<void> {
  await userEvent.type(await screen.findByLabelText('Nombre'), 'Mi ejercicio');
  await userEvent.click(screen.getByRole('radio', { name: categoria }));
  await userEvent.click(grupo('Capacidades').getByRole('checkbox', { name: 'Fuerza' }));
  await userEvent.selectOptions(screen.getByLabelText('Grupo muscular primario'), primario);
}

describe('Nuevo ejercicio (F1-12, mockup 9)', () => {
  describe('la pestaña Crear (F5-11)', () => {
    it('pide la definición campo por campo, con las seis categorías', async () => {
      renderNuevo();

      await screen.findByLabelText('Nombre');
      const categorias = grupo('Categoría').getAllByRole('radio');
      expect(categorias).toHaveLength(6);
      expect(grupo('Capacidades').getAllByRole('checkbox')).toHaveLength(4);
      expect(screen.getByLabelText('Grupo muscular primario')).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Grupos musculares secundarios' })).toBeVisible();
      expect(screen.getByRole('group', { name: 'Disciplinas (opcional)' })).toBeVisible();
      expect(screen.getByLabelText('Equipo (opcional)')).toBeInTheDocument();
    });

    it('ya no ofrece el catálogo como sugerencias del campo Nombre', async () => {
      renderNuevo();

      expect(await screen.findByLabelText('Nombre')).not.toHaveAttribute('list');
    });

    it('distancia con carga se puede elegir, y pide los metros y el peso (F5-03b)', async () => {
      renderNuevo();

      await userEvent.click(
        await screen.findByRole('radio', { name: 'Distancia con carga (metros y peso)' }),
      );

      expect(screen.getByLabelText('Distancia (m)')).toBeInTheDocument();
      expect(screen.getByLabelText('Peso (kg)')).toBeInTheDocument();
    });

    it('cardio se puede elegir, y pide los metros y las calorías (F5-03a)', async () => {
      renderNuevo();

      await userEvent.click(
        await screen.findByRole('radio', { name: 'Cardio (metros y calorías)' }),
      );

      expect(screen.getByLabelText('Distancia (m)')).toBeInTheDocument();
      expect(screen.getByLabelText('Calorías (kcal)')).toBeInTheDocument();
    });

    it('el grupo primario no se ofrece como secundario, y elegirlo lo saca de los secundarios', async () => {
      renderNuevo();
      await screen.findByLabelText('Nombre');

      await userEvent.click(
        grupo('Grupos musculares secundarios').getByRole('checkbox', { name: 'Core' }),
      );
      expect(
        grupo('Grupos musculares secundarios').getByRole('checkbox', { name: 'Core' }),
      ).toBeChecked();

      await userEvent.selectOptions(screen.getByLabelText('Grupo muscular primario'), 'Core');

      expect(
        grupo('Grupos musculares secundarios').queryByRole('checkbox', { name: 'Core' }),
      ).not.toBeInTheDocument();
    });

    it('un nombre igual al del catálogo avisa, pero no bloquea', async () => {
      const { api } = renderNuevo();
      await screen.findByLabelText('Nombre');

      await userEvent.type(screen.getByLabelText('Nombre'), 'sentadilla TRASERA');

      expect(await screen.findByRole('status')).toHaveTextContent('Ya hay un «Sentadilla trasera»');

      await userEvent.click(screen.getByRole('radio', { name: 'Fuerza (RM en kg)' }));
      await userEvent.click(grupo('Capacidades').getByRole('checkbox', { name: 'Fuerza' }));
      await userEvent.selectOptions(screen.getByLabelText('Grupo muscular primario'), 'Cuádriceps');
      await userEvent.type(screen.getByLabelText('RM (kg)'), '100');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      // Se guarda como propio: el nombre no decide nada, la pestaña sí.
      expect(api.client.addExercise).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'custom', name: 'sentadilla TRASERA' }),
      );
    });
  });

  describe('guardar uno propio', () => {
    it('viaja con su definición: categoría, capacidades, primario, secundarios, disciplinas y equipo', async () => {
      const { api } = renderNuevo();

      await completarPropio('Gimnástico (repeticiones)');
      await userEvent.click(
        grupo('Grupos musculares secundarios').getByRole('checkbox', { name: 'Core' }),
      );
      await userEvent.click(
        grupo('Disciplinas (opcional)').getByRole('checkbox', { name: 'CrossFit' }),
      );
      await userEvent.selectOptions(screen.getByLabelText('Equipo (opcional)'), 'Barra');
      await userEvent.type(screen.getByLabelText('Repeticiones'), '30');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      expect(api.client.addExercise).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'custom',
          name: 'Mi ejercicio',
          category: 'gimnastico',
          capacities: ['fuerza'],
          primaryMuscleGroup: 'hombro',
          secondaryMuscleGroups: ['core'],
          disciplines: ['crossfit'],
          equipment: 'barra',
        }),
      );
    });

    it('sin disciplinas ni equipo se guarda igual, y no los manda', async () => {
      const { api } = renderNuevo();

      await completarPropio('Gimnástico (repeticiones)');
      await userEvent.type(screen.getByLabelText('Repeticiones'), '30');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      const [input] = api.client.addExercise.mock.calls[0] ?? [];
      expect(input).toMatchObject({ source: 'custom', disciplines: [] });
      expect(input).not.toHaveProperty('equipment');
    });

    it('sin grupo primario ni capacidades lo pide, sin llamar a la API', async () => {
      const { api } = renderNuevo();

      await userEvent.type(await screen.findByLabelText('Nombre'), 'Mi ejercicio');
      await userEvent.click(screen.getByRole('radio', { name: 'Gimnástico (repeticiones)' }));
      await userEvent.type(screen.getByLabelText('Repeticiones'), '30');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      expect(await screen.findByText('Elegí al menos una capacidad')).toBeInTheDocument();
      expect(screen.getByText('Elegí el grupo muscular primario')).toBeInTheDocument();
      expect(api.client.addExercise).not.toHaveBeenCalled();
    });

    it('sin RM, aclara que se anota la mejor marca: repeticiones máximas o mejor tiempo', async () => {
      renderNuevo();

      await completarPropio('Gimnástico (repeticiones)');
      expect(screen.getByLabelText('Repeticiones')).toHaveAccessibleDescription(
        /máximas repeticiones/i,
      );

      await userEvent.click(screen.getByRole('radio', { name: 'Running (tiempo)' }));
      expect(screen.getByLabelText('Tiempo (mm:ss)')).toHaveAccessibleDescription(
        /tu mejor tiempo/i,
      );

      await userEvent.click(screen.getByRole('radio', { name: 'Fuerza (RM en kg)' }));
      expect(screen.getByLabelText('RM (kg)')).not.toHaveAccessibleDescription();
    });

    it('un tiempo se escribe mm:ss y se guarda en segundos', async () => {
      const { api } = renderNuevo();

      await completarPropio('Running (tiempo)');
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

      await completarPropio('Running (tiempo)');
      // "0299" queda "02:99": 99 segundos no es un tiempo válido.
      await userEvent.type(screen.getByLabelText('Tiempo (mm:ss)'), '0299');
      await userEvent.type(screen.getByLabelText('Desnivel (m)'), '150');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      expect(await screen.findByText('Escribilo como mm:ss, por ejemplo 4:32')).toBeInTheDocument();
      expect(api.client.addExercise).not.toHaveBeenCalled();
    });

    it('running sin desnivel se frena en el formulario', async () => {
      const { api } = renderNuevo();

      await completarPropio('Running (tiempo)');
      await userEvent.type(screen.getByLabelText('Tiempo (mm:ss)'), '0432');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      expect(
        await screen.findByText('Cargá el desnivel, como 150 (0 si es plano)'),
      ).toBeInTheDocument();
      expect(api.client.addExercise).not.toHaveBeenCalled();
    });

    it('sin nivel, el error lo dice en es-AR y no lo escupe Zod en inglés', async () => {
      const { api } = renderNuevo();

      await completarPropio('Fuerza (RM en kg)');
      await userEvent.type(screen.getByLabelText('RM (kg)'), '100');
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Elegí tu nivel');
      expect(api.client.addExercise).not.toHaveBeenCalled();
    });
  });

  describe('la pestaña Catálogo (F5-10)', () => {
    it('se abre por el catálogo y lista los precargados con su categoría, grupo y equipo', async () => {
      renderNuevo(fakeApi(), '/ejercicios/nuevo');

      expect(await screen.findByRole('tab', { name: 'Catálogo', selected: true })).toBeVisible();
      const sentadilla = await screen.findByRole('button', { name: /Sentadilla trasera/ });
      expect(sentadilla).toHaveTextContent('Fuerza · Cuádriceps · Barra');
      expect(screen.getByRole('button', { name: /Carrera 1 km/ })).toHaveTextContent('Running');
    });

    it('el buscador filtra sin distinguir mayúsculas ni acentos', async () => {
      renderNuevo(fakeApi(), '/ejercicios/nuevo');
      await screen.findByRole('button', { name: /Sentadilla trasera/ });

      await userEvent.type(screen.getByLabelText('Buscar en el catálogo'), 'CARRERA');

      expect(screen.queryByRole('button', { name: /Sentadilla/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Carrera 1 km/ })).toBeInTheDocument();
    });

    it('el filtro de disciplina deja sólo los de esa disciplina', async () => {
      renderNuevo(fakeApi(), '/ejercicios/nuevo');
      await screen.findByRole('button', { name: /Sentadilla trasera/ });

      await userEvent.click(screen.getByRole('radio', { name: 'Hyrox' }));

      expect(screen.getByRole('button', { name: /Wall Ball/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Sentadilla/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Carrera/ })).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('radio', { name: 'Todas' }));

      expect(screen.getByRole('button', { name: /Sentadilla trasera/ })).toBeInTheDocument();
    });

    it('sin coincidencias, lo dice y manda a crearlo', async () => {
      renderNuevo(fakeApi(), '/ejercicios/nuevo');
      await screen.findByRole('button', { name: /Sentadilla trasera/ });

      await userEvent.type(screen.getByLabelText('Buscar en el catálogo'), 'zzz');

      expect(await screen.findByRole('status')).toHaveTextContent('Ningún ejercicio');
    });

    it('los que el usuario ya tiene se ven, pero no se pueden elegir', async () => {
      renderNuevo(fakeApi(), '/ejercicios/nuevo', [
        { ...SENTADILLA, alreadyAdded: true },
        CARRERA,
        WALL_BALL,
      ]);

      expect(await screen.findByText('Ya lo tenés en tu lista')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Sentadilla/ })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Carrera 1 km/ })).toBeInTheDocument();
    });

    it('elegir uno abre el formulario con toda su definición', async () => {
      const { router } = await elegir(/Sentadilla trasera/);

      expect(screen.getByLabelText('Nombre')).toHaveValue('Sentadilla trasera');
      expect(grupo('Categoría').getByRole('radio', { name: 'Fuerza (RM en kg)' })).toBeChecked();
      expect(grupo('Capacidades').getByRole('checkbox', { name: 'Fuerza' })).toBeChecked();
      expect(screen.getByLabelText('Grupo muscular primario')).toHaveValue('cuadriceps');
      const secundarios = grupo('Grupos musculares secundarios');
      expect(secundarios.getByRole('checkbox', { name: 'Glúteo' })).toBeChecked();
      expect(secundarios.getByRole('checkbox', { name: 'Core' })).toBeChecked();
      expect(
        grupo('Disciplinas (opcional)').getByRole('checkbox', { name: 'Musculación' }),
      ).toBeChecked();
      expect(screen.getByLabelText('Equipo (opcional)')).toHaveValue('barra');
      expect(screen.getByLabelText('RM (kg)')).toHaveValue('');
      expect(router.state.location.search).toEqual({ modo: 'crear' });
    });

    it('cambiar de pestaña con el navegador vuelve al catálogo', async () => {
      const { router } = await elegir(/Sentadilla trasera/);

      router.history.back();

      expect(await screen.findByRole('tab', { name: 'Catálogo', selected: true })).toBeVisible();
    });
  });

  describe('un precargado editado pasa a ser propio (F5-08)', () => {
    it('sin tocar la definición, avisa que partís del catálogo y viaja como precargado', async () => {
      const { api } = await elegir(/Sentadilla trasera/);

      expect(screen.getByRole('status')).toHaveTextContent(
        'Partís de Sentadilla trasera del catálogo. Si cambiás algo de su definición, se guarda como ejercicio propio.',
      );

      await userEvent.type(screen.getByLabelText('RM (kg)'), '100');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      const [input] = api.client.addExercise.mock.calls[0] ?? [];
      expect(input).toMatchObject({
        source: 'catalog',
        exerciseId: 'exo_a1b2c3d4',
        definition: {
          name: 'Sentadilla trasera',
          primaryMuscleGroup: 'cuadriceps',
          secondaryMuscleGroups: ['gluteo', 'core'],
        },
      });
    });

    it('apenas se edita un campo, avisa que se guarda como propio; volviendo al valor, se va', async () => {
      await elegir(/Sentadilla trasera/);

      await userEvent.selectOptions(screen.getByLabelText('Grupo muscular primario'), 'Glúteo');

      expect(screen.getByRole('status')).toHaveTextContent('se va a guardar como ejercicio propio');

      await userEvent.selectOptions(screen.getByLabelText('Grupo muscular primario'), 'Cuádriceps');
      // Al elegir otro primario, el glúteo salió de los secundarios: se lo vuelve a tildar.
      await userEvent.click(
        grupo('Grupos musculares secundarios').getByRole('checkbox', { name: 'Glúteo' }),
      );

      expect(screen.getByRole('status')).not.toHaveTextContent(
        'se va a guardar como ejercicio propio',
      );
    });

    it('editar la marca, el nivel o los comentarios no lo convierte', async () => {
      await elegir(/Sentadilla trasera/);

      await userEvent.type(screen.getByLabelText('RM (kg)'), '100');
      await userEvent.type(screen.getByLabelText('Comentarios (opcional)'), 'Con cinturón');
      await completarComun();

      expect(screen.getByRole('status')).not.toHaveTextContent(
        'se va a guardar como ejercicio propio',
      );
    });

    it('editado, manda la definición editada con el ID del precargado: el servidor decide', async () => {
      const { api } = await elegir(/Sentadilla trasera/);

      await userEvent.selectOptions(screen.getByLabelText('Equipo (opcional)'), 'Kettlebell');
      await userEvent.type(screen.getByLabelText('RM (kg)'), '100');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      const [input] = api.client.addExercise.mock.calls[0] ?? [];
      expect(input).toMatchObject({
        source: 'catalog',
        exerciseId: 'exo_a1b2c3d4',
        definition: { equipment: 'kettlebell' },
      });
    });

    it('con el cupo de propios lleno, lo dice y ofrece volver a los valores del catálogo', async () => {
      const api = fakeApi({
        exercises: [],
        usage: { ...PLAN_FREE, total: 3, custom: 3 },
      });
      await elegir(/Sentadilla trasera/, api);

      await userEvent.selectOptions(screen.getByLabelText('Grupo muscular primario'), 'Glúteo');

      expect(await screen.findByText(/no admite más ejercicios propios/)).toBeInTheDocument();

      await userEvent.click(
        screen.getByRole('button', { name: 'Volver a los valores del catálogo' }),
      );

      expect(screen.getByLabelText('Grupo muscular primario')).toHaveValue('cuadriceps');
      expect(screen.queryByText(/no admite más ejercicios propios/)).not.toBeInTheDocument();
    });

    it('con el cupo libre, no avisa del límite', async () => {
      await elegir(/Sentadilla trasera/);

      await userEvent.selectOptions(screen.getByLabelText('Grupo muscular primario'), 'Glúteo');

      expect(screen.queryByText(/no admite más ejercicios propios/)).not.toBeInTheDocument();
    });

    it('"Empezar de cero" vacía el formulario y lo vuelve un propio', async () => {
      const { api } = await elegir(/Sentadilla trasera/);

      await userEvent.click(screen.getByRole('button', { name: 'Empezar de cero' }));

      expect(screen.getByLabelText('Nombre')).toHaveValue('');
      expect(screen.queryByText(/Partís de/)).not.toBeInTheDocument();
      expect(api.client.addExercise).not.toHaveBeenCalled();
    });
  });

  describe('después de guardar', () => {
    it('vuelve a la lista, y Home ya muestra el ejercicio nuevo', async () => {
      // El recorrido real: Home vacío, agregar, y volver. Home tiene la lista en caché,
      // así que si el alta no la invalida, el ejercicio nuevo no aparecería.
      const api = fakeApi();
      api.client.catalog.mockResolvedValue(CATALOGO);
      const { router } = renderApp('/', fakeSession(braian).client, api.client);
      await screen.findByText('Todavía no tenés ejercicios');

      api.client.addExercise.mockImplementation(() => {
        api.client.listExercises.mockResolvedValue({
          exercises: [SENTADILLA_GESTIONADA],
          usage: { ...PLAN_FREE, total: 1 },
        });
        return Promise.resolve(SENTADILLA_GESTIONADA);
      });

      await userEvent.click(screen.getByRole('link', { name: 'Agregar el primero' }));
      await userEvent.click(await screen.findByRole('button', { name: /Sentadilla trasera/ }));
      await userEvent.type(await screen.findByLabelText('RM (kg)'), '100');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      expect(await screen.findByText('Sentadilla trasera')).toBeInTheDocument();
      expect(router.state.location.pathname).toBe('/');
    });

    it('el catálogo se vuelve a pedir: el que se agregó pasa a decir "ya lo tenés"', async () => {
      const api = fakeApi();
      api.client.catalog.mockResolvedValue(CATALOGO);
      renderApp('/ejercicios/nuevo', fakeSession(braian).client, api.client);
      await userEvent.click(await screen.findByRole('button', { name: /Sentadilla trasera/ }));
      await userEvent.type(await screen.findByLabelText('RM (kg)'), '100');
      await completarComun();
      const pedidos = api.client.catalog.mock.calls.length;

      api.client.catalog.mockResolvedValue([
        { ...SENTADILLA, alreadyAdded: true },
        CARRERA,
        WALL_BALL,
      ]);
      api.client.addExercise.mockResolvedValue(SENTADILLA_GESTIONADA);
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      await screen.findByRole('heading', { name: 'Tus ejercicios' });
      expect(api.client.catalog.mock.calls.length).toBeGreaterThan(pedidos);
    });
  });

  describe('errores de la API', () => {
    it('el límite del plan se explica, no se muestra un error genérico', async () => {
      const { api } = await elegir(/Sentadilla trasera/);
      api.client.addExercise.mockRejectedValueOnce(
        new ApiError(
          403,
          'WC-SUBS-403-001',
          'Alcanzaste el máximo de 10 de tu plan Free.',
          'req-1',
        ),
      );

      await userEvent.type(screen.getByLabelText('RM (kg)'), '100');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Alcanzaste el máximo de 10 de tu plan Free.',
      );
    });

    it('un ejercicio repetido lo dice con el mensaje de la API', async () => {
      const { api } = await elegir(/Sentadilla trasera/);
      api.client.addExercise.mockRejectedValueOnce(
        new ApiError(409, 'WC-EXO-409-003', 'Ya tenés ese ejercicio en tu lista.', 'req-2'),
      );

      await userEvent.type(screen.getByLabelText('RM (kg)'), '100');
      await completarComun();
      await userEvent.click(screen.getByRole('button', { name: 'Guardar ejercicio' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Ya tenés ese ejercicio en tu lista.',
      );
    });
  });

  it('se puede volver a la lista sin guardar', async () => {
    const { router } = renderNuevo();

    await userEvent.click(await screen.findByRole('link', { name: 'Ejercicios' }));

    expect(router.state.location.pathname).toBe('/');
  });

  describe('accesibilidad', () => {
    const auditar = () => axe.run(document.body, { rules: { region: { enabled: false } } });

    it('la pestaña Catálogo, con resultados', async () => {
      renderNuevo(fakeApi(), '/ejercicios/nuevo');
      await screen.findByRole('button', { name: /Sentadilla trasera/ });

      expect((await auditar()).violations.map((violation) => violation.id)).toEqual([]);
    });

    it('la pestaña Crear', async () => {
      renderNuevo();
      await screen.findByLabelText('Nombre');

      expect((await auditar()).violations.map((violation) => violation.id)).toEqual([]);
    });

    it('la pestaña Crear con un precargado editado', async () => {
      await elegir(/Sentadilla trasera/);
      await userEvent.selectOptions(screen.getByLabelText('Grupo muscular primario'), 'Glúteo');

      expect((await auditar()).violations.map((violation) => violation.id)).toEqual([]);
    });
  });
});
