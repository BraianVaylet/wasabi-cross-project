import type { Exercise } from '@wasabi-cross/schemas';
import { describe, expect, it } from 'vitest';
import { formatDate } from '../../lib/format.ts';
import {
  EMPTY_VALUES,
  catalogNameMatch,
  definitionOf,
  definitionValuesOf,
  filterCatalog,
  isEdited,
  kindFor,
  newExerciseSchema,
  toAddExercise,
  valuesFromCatalog,
  type NewExerciseValues,
} from './form.ts';

const sentadilla: Exercise = {
  id: 'exo_a1b2c3d4',
  ownerId: null,
  catalogKey: 'back-squat',
  name: 'Sentadilla trasera',
  category: 'fuerza',
  capacities: ['fuerza'],
  primaryMuscleGroup: 'cuadriceps',
  muscleGroups: ['cuadriceps', 'gluteo', 'core'],
  bodySegment: 'tren_inferior',
  disciplines: ['gimnasio'],
  equipment: 'barra',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const wallBall: Exercise = {
  ...sentadilla,
  id: 'exo_z9y8x7w6',
  catalogKey: 'wall-ball',
  name: 'Wall Ball',
  category: 'gimnastico',
  capacities: ['resistencia'],
  primaryMuscleGroup: 'cuerpo_completo',
  muscleGroups: ['cuerpo_completo', 'cuadriceps', 'hombro'],
  bodySegment: 'cuerpo_completo',
  disciplines: ['crossfit', 'hyrox'],
  equipment: 'balon_medicinal',
};

const catalogo = [sentadilla, wallBall];

/** Un ejercicio propio completo: lo mínimo que el formulario acepta. */
const propio: NewExerciseValues = {
  ...EMPTY_VALUES,
  name: 'Sentadilla del garage',
  category: 'fuerza',
  capacities: ['fuerza'],
  primaryMuscleGroup: 'cuadriceps',
  value: '100',
  level: 'intermedio',
  date: '2026-06-23',
};

describe('kindFor — qué mide lo que se está cargando', () => {
  it('lo dice la categoría', () => {
    expect(kindFor('fuerza')).toBe('rm');
    expect(kindFor('running')).toBe('time');
    expect(kindFor('cardio')).toBe('distance');
    expect(kindFor('distancia_carga')).toBe('weighted_distance');
  });

  it('sin categoría todavía no se sabe', () => {
    expect(kindFor('')).toBeNull();
  });
});

describe('newExerciseSchema — lo que se valida antes de llamar a la API', () => {
  const messagesOf = (values: NewExerciseValues) =>
    (newExerciseSchema.safeParse(values).error?.issues ?? []).map((issue) => ({
      path: issue.path,
      message: issue.message,
    }));

  it('acepta un ejercicio propio completo', () => {
    expect(newExerciseSchema.safeParse(propio).success).toBe(true);
  });

  it('necesita categoría', () => {
    expect(messagesOf({ ...propio, category: '' })).toContainEqual({
      path: ['category'],
      message: 'Elegí una categoría',
    });
  });

  it('necesita capacidades (spec §5.1)', () => {
    expect(messagesOf({ ...propio, capacities: [] })).toContainEqual({
      path: ['capacities'],
      message: 'Elegí al menos una capacidad',
    });
  });

  it('necesita el grupo primario, y sin él no llama a la API', () => {
    expect(messagesOf({ ...propio, primaryMuscleGroup: '' })).toContainEqual({
      path: ['primaryMuscleGroup'],
      message: 'Elegí el grupo muscular primario',
    });
  });

  it('el primario no se repite como secundario', () => {
    expect(messagesOf({ ...propio, secondaryMuscleGroups: ['cuadriceps'] })).toContainEqual({
      path: ['secondaryMuscleGroups'],
      message: 'El grupo primario no se repite como secundario',
    });
  });

  it('las disciplinas, el equipo y los secundarios son opcionales', () => {
    expect(
      newExerciseSchema.safeParse({
        ...propio,
        disciplines: [],
        equipment: '',
        secondaryMuscleGroups: [],
      }).success,
    ).toBe(true);
  });

  it('el nombre y el nivel son obligatorios', () => {
    expect(newExerciseSchema.safeParse({ ...propio, name: '  ' }).success).toBe(false);
    expect(newExerciseSchema.safeParse({ ...propio, level: '' }).success).toBe(false);
  });

  it('sin nivel, el mensaje está en es-AR y no es el crudo de Zod', () => {
    expect(messagesOf({ ...propio, level: '' })).toContainEqual({
      path: ['level'],
      message: 'Elegí tu nivel',
    });
  });

  it('un tiempo mal escrito se rechaza en el campo de la marca', () => {
    const [issue] = messagesOf({ ...propio, category: 'running', value: '4:72' });

    expect(issue?.path).toEqual(['value']);
    expect(issue?.message).toMatch(/mm:ss/);
  });

  it('una marca que no es un número se rechaza', () => {
    expect(messagesOf({ ...propio, value: 'cien' })[0]?.path).toEqual(['value']);
  });

  it('distancia con carga pide el peso (F5-03b)', () => {
    const sled = { ...propio, category: 'distancia_carga' as const, value: '50' };

    expect(messagesOf(sled).map((issue) => issue.message)).toContain('Cargá el peso, como 80');
    expect(newExerciseSchema.safeParse({ ...sled, extra: '152' }).success).toBe(true);
  });

  it('cardio pide las calorías (F5-03a)', () => {
    const cardio = { ...propio, category: 'cardio' as const, value: '2000' };

    expect(messagesOf(cardio).map((issue) => issue.message)).toContain(
      'Cargá las calorías, como 120',
    );
    expect(newExerciseSchema.safeParse({ ...cardio, extra: '120' }).success).toBe(true);
  });
});

describe('valuesFromCatalog — elegir un precargado llena el formulario', () => {
  it('trae toda su definición, con el primario aparte de los secundarios', () => {
    expect(valuesFromCatalog(sentadilla)).toMatchObject({
      catalogId: 'exo_a1b2c3d4',
      name: 'Sentadilla trasera',
      category: 'fuerza',
      capacities: ['fuerza'],
      primaryMuscleGroup: 'cuadriceps',
      secondaryMuscleGroups: ['gluteo', 'core'],
      disciplines: ['gimnasio'],
      equipment: 'barra',
    });
  });

  it('lo del usuario arranca vacío: la marca, el nivel, la fecha y los comentarios', () => {
    expect(valuesFromCatalog(sentadilla)).toMatchObject({
      value: '',
      level: '',
      date: '',
      notes: '',
      withPain: false,
    });
  });

  it('uno sin equipo deja el campo vacío, no "undefined"', () => {
    const { equipment: _equipment, ...sinEquipo } = sentadilla;

    expect(valuesFromCatalog(sinEquipo).equipment).toBe('');
  });
});

describe('isEdited — cuándo un precargado pasa a ser propio', () => {
  const values = valuesFromCatalog(sentadilla);

  it('sin tocar nada no está editado', () => {
    expect(isEdited(sentadilla, values)).toBe(false);
  });

  it('el nombre en otras mayúsculas o el orden de los secundarios no son ediciones', () => {
    expect(
      isEdited(sentadilla, {
        ...values,
        name: 'SENTADILLA trasera',
        secondaryMuscleGroups: ['core', 'gluteo'],
      }),
    ).toBe(false);
  });

  it.each<[string, Partial<NewExerciseValues>]>([
    ['el nombre', { name: 'Sentadilla con pausa' }],
    ['la categoría', { category: 'hipertrofia' }],
    ['las capacidades', { capacities: ['fuerza', 'potencia'] }],
    ['el grupo primario', { primaryMuscleGroup: 'gluteo', secondaryMuscleGroups: ['core'] }],
    ['los secundarios', { secondaryMuscleGroups: ['gluteo'] }],
    ['las disciplinas', { disciplines: ['gimnasio', 'crossfit'] }],
    ['el equipo', { equipment: 'maquina' }],
  ])('cambiar %s lo edita', (_campo, cambio) => {
    expect(isEdited(sentadilla, { ...values, ...cambio })).toBe(true);
  });

  it('borrar el primario o la categoría también es editar', () => {
    expect(isEdited(sentadilla, { ...values, primaryMuscleGroup: '' })).toBe(true);
    expect(isEdited(sentadilla, { ...values, category: '' })).toBe(true);
  });

  it('lo que es del usuario no edita nada: la marca, el nivel y los comentarios', () => {
    expect(
      isEdited(sentadilla, {
        ...values,
        value: '100',
        level: 'elite',
        notes: 'Con cinturón',
        withPain: true,
      }),
    ).toBe(false);
  });

  it('volver al valor original quita la edición', () => {
    const editado = { ...values, name: 'Otra' };
    expect(isEdited(sentadilla, editado)).toBe(true);

    expect(isEdited(sentadilla, { ...editado, ...definitionValuesOf(sentadilla) })).toBe(false);
  });
});

describe('definitionOf', () => {
  it('sin categoría o sin primario todavía no hay definición', () => {
    expect(definitionOf({ ...propio, category: '' })).toBeNull();
    expect(definitionOf({ ...propio, primaryMuscleGroup: '' })).toBeNull();
  });

  it('sin equipo, no manda el campo', () => {
    expect(definitionOf(propio)).not.toHaveProperty('equipment');
    expect(definitionOf({ ...propio, equipment: 'barra' })).toMatchObject({ equipment: 'barra' });
  });

  it('recorta el nombre', () => {
    expect(definitionOf({ ...propio, name: '  Sentadilla  ' })?.name).toBe('Sentadilla');
  });
});

describe('toAddExercise — lo que viaja a la API', () => {
  it('uno creado de cero viaja como propio, con toda su definición', () => {
    const input = toAddExercise({
      ...propio,
      secondaryMuscleGroups: ['gluteo'],
      disciplines: ['gimnasio'],
      equipment: 'barra',
    });

    expect(input).toMatchObject({
      source: 'custom',
      name: 'Sentadilla del garage',
      category: 'fuerza',
      capacities: ['fuerza'],
      primaryMuscleGroup: 'cuadriceps',
      secondaryMuscleGroups: ['gluteo'],
      disciplines: ['gimnasio'],
      equipment: 'barra',
      firstRecord: { value: 100 },
    });
  });

  it('un nombre igual al del catálogo no lo convierte en uno del catálogo', () => {
    const input = toAddExercise({ ...propio, name: 'Sentadilla trasera' });

    expect(input.source).toBe('custom');
  });

  it('uno del catálogo viaja por su ID, con la definición como quedó', () => {
    const input = toAddExercise({
      ...valuesFromCatalog(sentadilla),
      value: '100',
      level: 'intermedio',
      notes: 'Con cinturón',
      withPain: true,
    });

    expect(input).toMatchObject({
      source: 'catalog',
      exerciseId: 'exo_a1b2c3d4',
      definition: {
        name: 'Sentadilla trasera',
        category: 'fuerza',
        primaryMuscleGroup: 'cuadriceps',
        secondaryMuscleGroups: ['gluteo', 'core'],
        disciplines: ['gimnasio'],
        equipment: 'barra',
      },
      level: 'intermedio',
      withPain: true,
      notes: 'Con cinturón',
      firstRecord: { value: 100 },
    });
  });

  it('uno del catálogo editado manda la definición editada: el servidor decide si es propio', () => {
    const input = toAddExercise({
      ...valuesFromCatalog(sentadilla),
      primaryMuscleGroup: 'gluteo',
      secondaryMuscleGroups: ['core'],
      value: '100',
      level: 'intermedio',
    });

    expect(input).toMatchObject({
      source: 'catalog',
      exerciseId: 'exo_a1b2c3d4',
      definition: { primaryMuscleGroup: 'gluteo', secondaryMuscleGroups: ['core'] },
    });
  });

  it('el segmento del cuerpo no viaja: lo deriva el servidor (spec §5.1)', () => {
    expect(toAddExercise(propio)).not.toHaveProperty('bodySegment');
  });

  it('un tiempo se guarda en segundos', () => {
    const input = toAddExercise({ ...propio, category: 'running', value: '4:32' });

    expect(input.firstRecord.value).toBe(272);
  });

  it('la fecha elegida viaja al mediodía, para que no se corra de día por la zona horaria', () => {
    const input = toAddExercise(propio);

    // Mirado desde la zona del usuario, sigue siendo el mismo día en cualquier huso.
    expect(formatDate(input.firstRecord.performedAt ?? '')).toBe('23/06/2026');
  });

  it('sin fecha, no manda ninguna: la pone la API', () => {
    expect(toAddExercise({ ...propio, date: '' }).firstRecord.performedAt).toBeUndefined();
  });

  it('distancia con carga manda el peso con los metros (F5-03b)', () => {
    const input = toAddExercise({
      ...propio,
      category: 'distancia_carga',
      value: '50',
      extra: '152',
    });

    expect(input.firstRecord).toMatchObject({ value: 50, weightKg: 152 });
  });

  it('cardio manda las calorías con los metros (F5-03a)', () => {
    const input = toAddExercise({ ...propio, category: 'cardio', value: '2000', extra: '120' });

    expect(input.firstRecord).toMatchObject({ value: 2000, caloriesKcal: 120 });
  });

  it('sin comentarios, no manda el campo vacío', () => {
    expect(toAddExercise(propio).notes).toBeUndefined();
  });
});

describe('catalogNameMatch — el aviso de un nombre parecido', () => {
  it('encuentra el del catálogo sin distinguir mayúsculas ni acentos', () => {
    expect(catalogNameMatch(catalogo, 'sentadilla TRASERA')?.id).toBe('exo_a1b2c3d4');
  });

  it('sin nombre o sin coincidencia no avisa', () => {
    expect(catalogNameMatch(catalogo, '  ')).toBeUndefined();
    expect(catalogNameMatch(catalogo, 'Press banca')).toBeUndefined();
  });
});

describe('filterCatalog — el buscador y el filtro de disciplina', () => {
  it('sin filtros trae todo', () => {
    expect(filterCatalog(catalogo, '', null)).toHaveLength(2);
  });

  it('por nombre, sin distinguir mayúsculas ni acentos', () => {
    expect(filterCatalog(catalogo, 'WALL', null).map((e) => e.name)).toEqual(['Wall Ball']);
  });

  it('por disciplina', () => {
    expect(filterCatalog(catalogo, '', 'hyrox').map((e) => e.name)).toEqual(['Wall Ball']);
    expect(filterCatalog(catalogo, '', 'gimnasio').map((e) => e.name)).toEqual([
      'Sentadilla trasera',
    ]);
  });

  it('con los dos, se cumplen los dos', () => {
    expect(filterCatalog(catalogo, 'sentadilla', 'hyrox')).toEqual([]);
  });
});
