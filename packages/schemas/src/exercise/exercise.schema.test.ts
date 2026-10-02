import { describe, expect, it } from 'vitest';
import {
  catalogExerciseDefinitionSchema,
  exerciseCategorySchema,
  exerciseDefinitionSchema,
  exerciseSchema,
  isCatalogExercise,
  measureKindFor,
  muscleGroupsFrom,
  measureKindSchema,
} from './exercise.schema.ts';

const customExercise = {
  id: 'exo_a1b2c3d4',
  ownerId: 'usr_a1b2c3d4',
  name: 'Wall ball',
  category: 'gimnastico',
  capacities: ['fuerza', 'resistencia'],
  primaryMuscleGroup: 'cuadriceps',
  muscleGroups: ['cuadriceps', 'hombro'],
  bodySegment: 'tren_inferior',
  disciplines: [],
  createdAt: '2026-09-17T14:03:11.412Z',
  updatedAt: '2026-09-17T14:03:11.412Z',
};

const catalogExercise = {
  ...customExercise,
  ownerId: null,
  catalogKey: 'back-squat',
  name: 'Back squat',
  category: 'fuerza',
  capacities: ['fuerza'],
  primaryMuscleGroup: 'cuadriceps',
  muscleGroups: ['cuadriceps', 'gluteo'],
  bodySegment: 'tren_inferior',
  disciplines: ['musculacion'],
  equipment: 'barra',
};

describe('measureKindFor', () => {
  it('la categoría define qué se mide (spec §5.1)', () => {
    expect(measureKindFor('fuerza')).toBe('rm');
    expect(measureKindFor('hipertrofia')).toBe('weighted_reps');
    expect(measureKindFor('gimnastico')).toBe('reps');
    expect(measureKindFor('running')).toBe('time');
    expect(measureKindFor('cardio')).toBe('distance');
    expect(measureKindFor('distancia_carga')).toBe('weighted_distance');
  });

  it('tiene respuesta para toda categoría, sin excepción', () => {
    for (const category of exerciseCategorySchema.options) {
      expect(measureKindSchema.options).toContain(measureKindFor(category));
    }
  });
});

describe('exerciseCategorySchema', () => {
  it('son las cuatro de los mockups más cardio y distancia con carga (ADR-0009)', () => {
    expect(exerciseCategorySchema.options).toEqual([
      'fuerza',
      'hipertrofia',
      'gimnastico',
      'running',
      'cardio',
      'distancia_carga',
    ]);
  });

  it('rechaza "otro": no aparece en ningún mockup', () => {
    expect(exerciseCategorySchema.safeParse('otro').success).toBe(false);
  });
});

describe('exerciseSchema', () => {
  it('un ejercicio propio también lleva capacidades y grupos musculares (spec §5.1)', () => {
    expect(exerciseSchema.safeParse(customExercise).success).toBe(true);

    const { capacities: _capacities, ...sinCapacidades } = customExercise;
    expect(exerciseSchema.safeParse(sinCapacidades).success).toBe(false);
  });

  it('acepta un ejercicio del catálogo con capacidades y grupos musculares', () => {
    expect(exerciseSchema.safeParse(catalogExercise).success).toBe(true);
  });

  it('uno propio no necesita disciplinas con contenido, equipo ni clave (spec §5.1)', () => {
    expect(customExercise.disciplines).toEqual([]);
    expect(customExercise).not.toHaveProperty('equipment');
    expect(exerciseSchema.safeParse(customExercise).success).toBe(true);
  });

  it('exige el grupo primario, y que encabece los grupos', () => {
    const { primaryMuscleGroup: _p, ...sinPrimario } = customExercise;

    expect(exerciseSchema.safeParse(sinPrimario).success).toBe(false);
    expect(
      exerciseSchema.safeParse({ ...customExercise, primaryMuscleGroup: 'hombro' }).success,
    ).toBe(false);
  });

  it('acepta la capacidad potencia y los grupos espalda baja y trapecio', () => {
    expect(
      exerciseSchema.safeParse({
        ...catalogExercise,
        capacities: ['potencia'],
        primaryMuscleGroup: 'trapecio',
        muscleGroups: ['trapecio', 'espalda_baja'],
      }).success,
    ).toBe(true);
  });

  it('no guarda tags: nivel y dolor son del usuario, no del ejercicio compartido', () => {
    const parsed = exerciseSchema.parse({
      ...catalogExercise,
      tags: { level: 'avanzado', discomfort: 'dolor' },
    });

    expect(parsed).not.toHaveProperty('tags');
  });

  it('no guarda la medición: se deriva de la categoría', () => {
    const parsed = exerciseSchema.parse({ ...catalogExercise, kind: 'reps' });

    expect(parsed).not.toHaveProperty('kind');
  });

  it('no guarda comentarios: son del usuario sobre el ejercicio gestionado', () => {
    const parsed = exerciseSchema.parse({ ...customExercise, notes: 'rodilla' });

    expect(parsed).not.toHaveProperty('notes');
  });

  it('rechaza un ownerId que no es un ID de usuario', () => {
    expect(exerciseSchema.safeParse({ ...customExercise, ownerId: 'exo_a1b2c3d4' }).success).toBe(
      false,
    );
  });

  it('rechaza HTML en el nombre', () => {
    expect(exerciseSchema.safeParse({ ...customExercise, name: '<b>Squat</b>' }).success).toBe(
      false,
    );
  });

  it('rechaza un nombre vacío', () => {
    expect(exerciseSchema.safeParse({ ...customExercise, name: '   ' }).success).toBe(false);
  });

  it('rechaza capacidades y grupos musculares repetidos', () => {
    expect(
      exerciseSchema.safeParse({ ...catalogExercise, capacities: ['fuerza', 'fuerza'] }).success,
    ).toBe(false);
    expect(
      exerciseSchema.safeParse({ ...catalogExercise, muscleGroups: ['gluteo', 'gluteo'] }).success,
    ).toBe(false);
  });
});

describe('exerciseDefinitionSchema', () => {
  it('lo que define un ejercicio propio es nombre y categoría', () => {
    expect(exerciseDefinitionSchema.parse({ name: 'Wall ball', category: 'gimnastico' })).toEqual({
      name: 'Wall ball',
      category: 'gimnastico',
    });
  });

  it('ignora el id y el dueño si el cliente los manda: los pone el servidor', () => {
    const parsed = exerciseDefinitionSchema.parse({
      name: 'Wall ball',
      category: 'gimnastico',
      id: 'exo_falsificado',
      ownerId: 'usr_otrousuario',
    });

    expect(parsed).not.toHaveProperty('id');
    expect(parsed).not.toHaveProperty('ownerId');
  });
});

describe('catalogExerciseDefinitionSchema', () => {
  const definition = {
    catalogKey: 'back-squat',
    name: 'Back squat',
    category: 'fuerza',
    capacities: ['fuerza'],
    primaryMuscleGroup: 'cuadriceps',
    muscleGroups: ['cuadriceps', 'gluteo', 'core'],
    disciplines: ['musculacion'],
    equipment: 'barra',
  };

  it('acepta una entrada completa del catálogo', () => {
    expect(catalogExerciseDefinitionSchema.safeParse(definition).success).toBe(true);
  });

  it('exige capacidades y grupos musculares: Estadísticas los necesita', () => {
    const { capacities: _c, ...sinCapacidades } = definition;
    const { muscleGroups: _m, ...sinGrupos } = definition;
    const { primaryMuscleGroup: _p, ...sinPrimario } = definition;

    expect(catalogExerciseDefinitionSchema.safeParse(sinCapacidades).success).toBe(false);
    expect(catalogExerciseDefinitionSchema.safeParse(sinGrupos).success).toBe(false);
    expect(catalogExerciseDefinitionSchema.safeParse(sinPrimario).success).toBe(false);
  });

  it('exige clave, disciplinas y equipo: son con lo que se busca (spec §5.3)', () => {
    const { catalogKey: _k, ...sinClave } = definition;
    const { equipment: _e, ...sinEquipo } = definition;

    expect(catalogExerciseDefinitionSchema.safeParse(sinClave).success).toBe(false);
    expect(catalogExerciseDefinitionSchema.safeParse(sinEquipo).success).toBe(false);
    expect(
      catalogExerciseDefinitionSchema.safeParse({ ...definition, disciplines: [] }).success,
    ).toBe(false);
  });

  it('acepta Hybrid y Pilates, con el equipo propio del método (ADR-0010)', () => {
    expect(
      catalogExerciseDefinitionSchema.safeParse({
        ...definition,
        disciplines: ['hybrid', 'pilates'],
        equipment: 'reformer',
      }).success,
    ).toBe(true);
  });

  it('rechaza una disciplina que no existe', () => {
    expect(
      catalogExerciseDefinitionSchema.safeParse({ ...definition, disciplines: ['natacion'] })
        .success,
    ).toBe(false);
  });

  it('rechaza una clave que no es un slug', () => {
    for (const catalogKey of ['Back Squat', 'back_squat', '-back', 'back--squat']) {
      expect(catalogExerciseDefinitionSchema.safeParse({ ...definition, catalogKey }).success).toBe(
        false,
      );
    }
  });

  it('rechaza disciplinas repetidas', () => {
    expect(
      catalogExerciseDefinitionSchema.safeParse({
        ...definition,
        disciplines: ['crossfit', 'crossfit'],
      }).success,
    ).toBe(false);
  });

  it('el primario encabeza los grupos: fuera de la lista, o no primero, se rechaza', () => {
    expect(
      catalogExerciseDefinitionSchema.safeParse({ ...definition, primaryMuscleGroup: 'hombro' })
        .success,
    ).toBe(false);
    expect(
      catalogExerciseDefinitionSchema.safeParse({ ...definition, primaryMuscleGroup: 'gluteo' })
        .success,
    ).toBe(false);
  });

  it('el primario no se repite como secundario', () => {
    expect(
      catalogExerciseDefinitionSchema.safeParse({
        ...definition,
        primaryMuscleGroup: 'espalda',
        muscleGroups: ['espalda', 'biceps', 'espalda'],
      }).success,
    ).toBe(false);
  });

  it('no guarda el segmento: se deriva del primario', () => {
    const parsed = catalogExerciseDefinitionSchema.parse({
      ...definition,
      bodySegment: 'cuerpo_completo',
    });

    expect(parsed).not.toHaveProperty('bodySegment');
  });
});

describe('isCatalogExercise', () => {
  it('sin dueño es del catálogo; con dueño es propio', () => {
    expect(isCatalogExercise({ ownerId: null })).toBe(true);
    expect(isCatalogExercise({ ownerId: 'usr_a1b2c3d4' })).toBe(false);
  });
});

describe('muscleGroupsFrom', () => {
  it('arma la lista que se guarda: el primario adelante, después los secundarios', () => {
    expect(muscleGroupsFrom('cuadriceps', ['gluteo', 'core'])).toEqual([
      'cuadriceps',
      'gluteo',
      'core',
    ]);
    expect(muscleGroupsFrom('core', [])).toEqual(['core']);
  });

  it('si el primario vino también como secundario, no lo repite', () => {
    expect(muscleGroupsFrom('espalda', ['biceps', 'espalda'])).toEqual(['espalda', 'biceps']);
  });
});
