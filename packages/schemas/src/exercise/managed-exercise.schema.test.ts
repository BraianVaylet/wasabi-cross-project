import { describe, expect, it } from 'vitest';
import { levelSchema, managedExerciseSchema } from './managed-exercise.schema.ts';

const managed = {
  id: 'mex_a1b2c3d4',
  userId: 'usr_braian0001',
  exerciseId: 'exo_backsquat1',
  level: 'intermedio',
  withPain: false,
  createdAt: '2026-09-18T10:00:00.000Z',
  updatedAt: '2026-09-18T10:00:00.000Z',
};

describe('levelSchema', () => {
  it('son los cuatro niveles de la leyenda del mockup 12', () => {
    expect(levelSchema.options).toEqual(['principiante', 'intermedio', 'avanzado', 'elite']);
  });

  it('rechaza un nivel que no existe', () => {
    expect(levelSchema.safeParse('experto').success).toBe(false);
  });
});

describe('managedExerciseSchema', () => {
  it('acepta un ejercicio gestionado válido', () => {
    expect(managedExerciseSchema.safeParse(managed).success).toBe(true);
  });

  it('nivel y dolor son de cada usuario: el mismo ejercicio puede tener valores distintos', () => {
    const deBraian = managedExerciseSchema.parse({ ...managed, withPain: true });
    const deUnAmigo = managedExerciseSchema.parse({
      ...managed,
      id: 'mex_z9y8x7w6',
      userId: 'usr_amigo00001',
      level: 'elite',
    });

    expect(deBraian.exerciseId).toBe(deUnAmigo.exerciseId);
    expect(deBraian.withPain).toBe(true);
    expect(deUnAmigo.withPain).toBe(false);
    expect(deUnAmigo.level).toBe('elite');
  });

  it('"con dolor" es un sí o no, como el checkbox del mockup 9', () => {
    expect(managedExerciseSchema.safeParse({ ...managed, withPain: 'dolor' }).success).toBe(false);
    expect(managedExerciseSchema.safeParse({ ...managed, withPain: 'molestia' }).success).toBe(
      false,
    );
  });

  it('el nivel es obligatorio: el formulario no lo marca como opcional', () => {
    const { level: _level, ...sinNivel } = managed;

    expect(managedExerciseSchema.safeParse(sinNivel).success).toBe(false);
  });

  it('los comentarios son opcionales y no aceptan HTML', () => {
    expect(managedExerciseSchema.safeParse(managed).success).toBe(true);
    expect(
      managedExerciseSchema.safeParse({ ...managed, notes: 'Cuidar la rodilla' }).success,
    ).toBe(true);
    expect(managedExerciseSchema.safeParse({ ...managed, notes: '<b>ojo</b>' }).success).toBe(
      false,
    );
  });

  it('usa IDs con prefijo mex_ y referencia a un ejercicio, no a otra cosa', () => {
    expect(managedExerciseSchema.safeParse({ ...managed, id: 'exo_a1b2c3d4' }).success).toBe(false);
    expect(
      managedExerciseSchema.safeParse({ ...managed, exerciseId: 'mex_a1b2c3d4' }).success,
    ).toBe(false);
  });
});
