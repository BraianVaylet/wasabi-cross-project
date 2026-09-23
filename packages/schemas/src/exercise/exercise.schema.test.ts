import { describe, expect, it } from 'vitest';
import {
  catalogExerciseDefinitionSchema,
  exerciseCategorySchema,
  exerciseDefinitionSchema,
  exerciseSchema,
  isCatalogExercise,
  measureKindFor,
} from './exercise.schema.ts';

const customExercise = {
  id: 'exo_a1b2c3d4',
  ownerId: 'usr_a1b2c3d4',
  name: 'Wall ball',
  category: 'gimnastico',
  capacities: ['fuerza', 'resistencia'],
  muscleGroups: ['cuadriceps', 'hombro'],
  bodySegment: 'cuerpo_completo',
  createdAt: '2026-09-17T14:03:11.412Z',
  updatedAt: '2026-09-17T14:03:11.412Z',
};

const catalogExercise = {
  ...customExercise,
  ownerId: null,
  name: 'Back squat',
  category: 'fuerza',
  capacities: ['fuerza'],
  muscleGroups: ['cuadriceps', 'gluteo'],
  bodySegment: 'tren_inferior',
};

describe('measureKindFor', () => {
  it('la categoría define qué se mide (spec §5.1)', () => {
    expect(measureKindFor('fuerza')).toBe('rm');
    expect(measureKindFor('hipertrofia')).toBe('weighted_reps');
    expect(measureKindFor('gimnastico')).toBe('reps');
    expect(measureKindFor('running')).toBe('time');
  });

  it('tiene respuesta para toda categoría, sin excepción', () => {
    for (const category of exerciseCategorySchema.options) {
      expect(['rm', 'reps', 'weighted_reps', 'time']).toContain(measureKindFor(category));
    }
  });
});

describe('exerciseCategorySchema', () => {
  it('son exactamente las cuatro categorías de los mockups', () => {
    expect(exerciseCategorySchema.options).toEqual([
      'fuerza',
      'hipertrofia',
      'gimnastico',
      'running',
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
    name: 'Back squat',
    category: 'fuerza',
    capacities: ['fuerza'],
    muscleGroups: ['cuadriceps'],
    bodySegment: 'tren_inferior',
  };

  it('acepta una entrada completa del catálogo', () => {
    expect(catalogExerciseDefinitionSchema.safeParse(definition).success).toBe(true);
  });

  it('exige capacidades, grupos musculares y segmento: Estadísticas los necesita', () => {
    const { capacities: _c, ...sinCapacidades } = definition;
    const { muscleGroups: _m, ...sinGrupos } = definition;
    const { bodySegment: _b, ...sinSegmento } = definition;

    expect(catalogExerciseDefinitionSchema.safeParse(sinCapacidades).success).toBe(false);
    expect(catalogExerciseDefinitionSchema.safeParse(sinGrupos).success).toBe(false);
    expect(catalogExerciseDefinitionSchema.safeParse(sinSegmento).success).toBe(false);
  });
});

describe('isCatalogExercise', () => {
  it('sin dueño es del catálogo; con dueño es propio', () => {
    expect(isCatalogExercise({ ownerId: null })).toBe(true);
    expect(isCatalogExercise({ ownerId: 'usr_a1b2c3d4' })).toBe(false);
  });
});
