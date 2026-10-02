import { describe, expect, it } from 'vitest';
import { trainingBreakdownSchema } from './breakdown.api.ts';

const REPARTO = {
  exercises: 2,
  byDiscipline: [
    { discipline: 'crossfit', exercises: 2, percent: 50 },
    { discipline: 'hyrox', exercises: 1, percent: 25 },
    { discipline: null, exercises: 1, percent: 25 },
  ],
  byCategory: [{ category: 'fuerza', exercises: 2, percent: 100 }],
  bySegment: [{ segment: 'tren_inferior', exercises: 2, percent: 100 }],
  byMuscleGroup: [
    { muscleGroup: 'cuadriceps', primary: 2, secondary: 0, score: 2, percent: 67 },
    { muscleGroup: 'core', primary: 0, secondary: 2, score: 1, percent: 33 },
  ],
};

describe('trainingBreakdownSchema — "Tu entrenamiento" (F7-01)', () => {
  it('acepta el reparto completo, con "sin disciplina" como null', () => {
    expect(trainingBreakdownSchema.parse(REPARTO)).toEqual(REPARTO);
  });

  it('un usuario sin ejercicios es un reparto vacío, no un error', () => {
    const vacio = {
      exercises: 0,
      byDiscipline: [],
      byCategory: [],
      bySegment: [],
      byMuscleGroup: [],
    };

    expect(trainingBreakdownSchema.parse(vacio)).toEqual(vacio);
  });

  it('una porción sin ejercicios no se informa', () => {
    const rota = {
      ...REPARTO,
      byCategory: [{ category: 'fuerza', exercises: 0, percent: 0 }],
    };

    expect(trainingBreakdownSchema.safeParse(rota).success).toBe(false);
  });

  it('el porcentaje es un entero entre 0 y 100', () => {
    for (const percent of [33.3, 101, -1]) {
      const rota = {
        ...REPARTO,
        bySegment: [{ segment: 'core', exercises: 1, percent }],
      };

      expect(trainingBreakdownSchema.safeParse(rota).success, String(percent)).toBe(false);
    }
  });

  it('un grupo que no suma nada no se informa: el puntaje mínimo es un secundario', () => {
    const rota = {
      ...REPARTO,
      byMuscleGroup: [{ muscleGroup: 'gemelo', primary: 0, secondary: 0, score: 0, percent: 0 }],
    };

    expect(trainingBreakdownSchema.safeParse(rota).success).toBe(false);
  });
});
