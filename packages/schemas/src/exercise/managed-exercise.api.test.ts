import { describe, expect, it } from 'vitest';
import {
  addExerciseSchema,
  exerciseListSchema,
  updateManagedExerciseSchema,
} from './managed-exercise.api.ts';

const firstRecord = { value: 100, performedAt: '2026-09-18T10:00:00.000Z' };

describe('addExerciseSchema — lo que manda "Nuevo ejercicio" (mockup 9)', () => {
  it('acepta uno del catálogo: sólo su ID, sin nombre ni categoría', () => {
    const parsed = addExerciseSchema.parse({
      source: 'catalog',
      exerciseId: 'exo_backsquat1',
      level: 'intermedio',
      firstRecord,
    });

    expect(parsed).toMatchObject({ source: 'catalog', exerciseId: 'exo_backsquat1' });
  });

  it('acepta uno propio: nombre, categoría, capacidades y grupos musculares', () => {
    expect(
      addExerciseSchema.safeParse({
        source: 'custom',
        name: 'Wall ball',
        category: 'gimnastico',
        capacities: ['fuerza', 'resistencia'],
        muscleGroups: ['cuadriceps', 'hombro'],
        level: 'principiante',
        firstRecord: { value: 30 },
      }).success,
    ).toBe(true);
  });

  it('uno propio sin capacidades o sin grupos musculares se rechaza: queda fuera de las estadísticas', () => {
    const base = {
      source: 'custom',
      name: 'Wall ball',
      category: 'gimnastico',
      level: 'principiante',
      firstRecord: { value: 30 },
    };

    expect(addExerciseSchema.safeParse({ ...base, muscleGroups: ['hombro'] }).success).toBe(false);
    expect(addExerciseSchema.safeParse({ ...base, capacities: ['fuerza'] }).success).toBe(false);
    expect(addExerciseSchema.safeParse({ ...base, capacities: [], muscleGroups: [] }).success).toBe(
      false,
    );
  });

  it('el segmento del cuerpo no se manda: lo deriva el servidor', () => {
    const parsed = addExerciseSchema.parse({
      source: 'custom',
      name: 'Wall ball',
      category: 'gimnastico',
      capacities: ['fuerza'],
      muscleGroups: ['hombro'],
      level: 'principiante',
      firstRecord: { value: 30 },
      bodySegment: 'tren_inferior',
    });

    expect(parsed).not.toHaveProperty('bodySegment');
  });

  it('"con dolor" arranca en no si el formulario no lo manda', () => {
    const parsed = addExerciseSchema.parse({
      source: 'catalog',
      exerciseId: 'exo_backsquat1',
      level: 'intermedio',
      firstRecord,
    });

    expect(parsed.withPain).toBe(false);
  });

  it('la primera marca es obligatoria: el formulario no la marca como opcional', () => {
    expect(
      addExerciseSchema.safeParse({
        source: 'catalog',
        exerciseId: 'exo_backsquat1',
        level: 'intermedio',
      }).success,
    ).toBe(false);
  });

  it('uno propio sin categoría se rechaza: es lo que define qué se mide', () => {
    expect(
      addExerciseSchema.safeParse({
        source: 'custom',
        name: 'Wall ball',
        capacities: ['fuerza'],
        muscleGroups: ['hombro'],
        level: 'principiante',
        firstRecord,
      }).success,
    ).toBe(false);
  });

  it('sin source no se sabe qué es: se rechaza', () => {
    expect(
      addExerciseSchema.safeParse({
        exerciseId: 'exo_backsquat1',
        level: 'intermedio',
        firstRecord,
      }).success,
    ).toBe(false);
  });

  it('ignora dueño e IDs que no le corresponde mandar al cliente', () => {
    const parsed = addExerciseSchema.parse({
      source: 'custom',
      name: 'Wall ball',
      category: 'gimnastico',
      capacities: ['fuerza'],
      muscleGroups: ['hombro'],
      level: 'principiante',
      firstRecord: { value: 30 },
      ownerId: 'usr_otrousuario',
      userId: 'usr_otrousuario',
      id: 'mex_falsificado',
    });

    expect(parsed).not.toHaveProperty('ownerId');
    expect(parsed).not.toHaveProperty('userId');
    expect(parsed).not.toHaveProperty('id');
  });
});

describe('exerciseListSchema — lo que muestra Home (mockup 4)', () => {
  it('acepta la lista con el uso del plan', () => {
    expect(
      exerciseListSchema.safeParse({
        exercises: [
          {
            id: 'mex_a1b2c3d4',
            exerciseId: 'exo_backsquat1',
            name: 'Back squat',
            category: 'fuerza',
            kind: 'rm',
            isCustom: false,
            level: 'intermedio',
            withPain: false,
            current: { value: 100, unit: 'kg', performedAt: '2026-06-23T10:00:00.000Z' },
          },
        ],
        usage: { plan: 'free', total: 1, custom: 0, maxTotal: 10, maxCustom: 3 },
      }).success,
    ).toBe(true);
  });

  it('en Max, los máximos son null: no hay límite', () => {
    expect(
      exerciseListSchema.safeParse({
        exercises: [],
        usage: { plan: 'max', total: 40, custom: 20, maxTotal: null, maxCustom: null },
      }).success,
    ).toBe(true);
  });
});

describe('updateManagedExerciseSchema — el lápiz del detalle (F1-06)', () => {
  it('acepta un cambio parcial', () => {
    expect(updateManagedExerciseSchema.parse({ level: 'avanzado' })).toEqual({ level: 'avanzado' });
    expect(updateManagedExerciseSchema.parse({ withPain: true })).toEqual({ withPain: true });
  });

  it('acepta comentarios vacíos: es la forma de borrarlos', () => {
    expect(updateManagedExerciseSchema.parse({ notes: '   ' })).toEqual({ notes: '' });
  });

  it('rechaza un update vacío', () => {
    expect(updateManagedExerciseSchema.safeParse({}).success).toBe(false);
  });

  it('rechaza cambiar la categoría: las marcas ya están en su unidad', () => {
    // Estricto a propósito: un campo de más no se descarta en silencio, se rechaza.
    expect(updateManagedExerciseSchema.safeParse({ category: 'running' }).success).toBe(false);
    expect(
      updateManagedExerciseSchema.safeParse({ level: 'avanzado', category: 'running' }).success,
    ).toBe(false);
  });

  it('rechaza un nombre vacío o con HTML', () => {
    expect(updateManagedExerciseSchema.safeParse({ name: '  ' }).success).toBe(false);
    expect(updateManagedExerciseSchema.safeParse({ name: '<b>x</b>' }).success).toBe(false);
  });
});
