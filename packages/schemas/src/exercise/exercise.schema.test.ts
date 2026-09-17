import { describe, expect, it } from 'vitest';
import {
  createExerciseSchema,
  exerciseSchema,
  isCatalogExercise,
  updateExerciseSchema,
} from './exercise.schema.ts';

const validExercise = {
  id: 'exo_a1b2c3d4',
  ownerId: null,
  name: 'Sentadilla trasera',
  category: 'fuerza',
  kind: 'rm',
  capacities: ['fuerza'],
  muscleGroups: ['cuadriceps', 'gluteo'],
  bodySegment: 'tren_inferior',
  tags: { load: 'pesada', level: 'intermedio' },
  createdAt: '2026-09-17T14:03:11.412Z',
  updatedAt: '2026-09-17T14:03:11.412Z',
};

describe('exerciseSchema', () => {
  it('acepta un ejercicio del catálogo (sin dueño)', () => {
    expect(exerciseSchema.safeParse(validExercise).success).toBe(true);
  });

  it('acepta un ejercicio custom con dueño', () => {
    expect(exerciseSchema.safeParse({ ...validExercise, ownerId: 'usr_a1b2c3d4' }).success).toBe(
      true,
    );
  });

  it('rechaza un ownerId que no es un ID de usuario', () => {
    expect(exerciseSchema.safeParse({ ...validExercise, ownerId: 'exo_a1b2c3d4' }).success).toBe(
      false,
    );
  });

  it('exige al menos una capacidad y un grupo muscular', () => {
    expect(exerciseSchema.safeParse({ ...validExercise, capacities: [] }).success).toBe(false);
    expect(exerciseSchema.safeParse({ ...validExercise, muscleGroups: [] }).success).toBe(false);
  });

  it('rechaza capacidades y grupos musculares repetidos', () => {
    expect(
      exerciseSchema.safeParse({ ...validExercise, capacities: ['fuerza', 'fuerza'] }).success,
    ).toBe(false);
    expect(
      exerciseSchema.safeParse({ ...validExercise, muscleGroups: ['gluteo', 'gluteo'] }).success,
    ).toBe(false);
  });

  it('rechaza HTML en el nombre y en las notas', () => {
    expect(exerciseSchema.safeParse({ ...validExercise, name: '<b>Squat</b>' }).success).toBe(
      false,
    );
    expect(
      exerciseSchema.safeParse({ ...validExercise, notes: '<script>alert(1)</script>' }).success,
    ).toBe(false);
  });

  it('acepta las tres formas de medir y nada más', () => {
    for (const kind of ['rm', 'time', 'reps']) {
      expect(exerciseSchema.safeParse({ ...validExercise, kind }).success).toBe(true);
    }
    expect(exerciseSchema.safeParse({ ...validExercise, kind: 'distancia' }).success).toBe(false);
  });

  it('el tag de malestar admite los tres niveles de la spec', () => {
    for (const discomfort of ['ninguno', 'molestia', 'dolor']) {
      expect(exerciseSchema.safeParse({ ...validExercise, tags: { discomfort } }).success).toBe(
        true,
      );
    }
  });

  it('todos los tags son opcionales', () => {
    expect(exerciseSchema.safeParse({ ...validExercise, tags: {} }).success).toBe(true);
  });
});

describe('isCatalogExercise', () => {
  it('sin dueño es del catálogo', () => {
    expect(isCatalogExercise({ ownerId: null })).toBe(true);
  });

  it('con dueño es custom', () => {
    expect(isCatalogExercise({ ownerId: 'usr_a1b2c3d4' })).toBe(false);
  });
});

describe('createExerciseSchema', () => {
  const payload = {
    name: 'Press banca',
    category: 'fuerza',
    kind: 'rm',
    capacities: ['fuerza'],
    muscleGroups: ['pectoral'],
    bodySegment: 'tren_superior',
  };

  it('acepta el payload mínimo: los tags son opcionales al crear', () => {
    expect(createExerciseSchema.safeParse(payload).success).toBe(true);
  });

  it('ignora el id y el dueño si el cliente los manda: los pone el servidor', () => {
    const parsed = createExerciseSchema.parse({
      ...payload,
      id: 'exo_falsificado',
      ownerId: 'usr_otrousuario',
    });

    expect(parsed).not.toHaveProperty('id');
    expect(parsed).not.toHaveProperty('ownerId');
  });

  it('exige el nombre', () => {
    const { name: _name, ...sinNombre } = payload;

    expect(createExerciseSchema.safeParse(sinNombre).success).toBe(false);
  });
});

describe('updateExerciseSchema', () => {
  it('acepta un cambio parcial', () => {
    expect(updateExerciseSchema.safeParse({ name: 'Press militar' }).success).toBe(true);
  });

  it('rechaza un update vacío', () => {
    expect(updateExerciseSchema.safeParse({}).success).toBe(false);
  });
});
