import { describe, expect, it } from 'vitest';
import { trainingBreakdown, withPercent, type BreakdownExercise } from './breakdown.ts';

/*
 * "Tu entrenamiento" (F7-01, spec §5.4): cómo se reparten los ejercicios del atleta por
 * disciplina, categoría, segmento y grupo muscular.
 */

const WALL_BALL: BreakdownExercise = {
  category: 'gimnastico',
  disciplines: ['crossfit', 'hyrox'],
  primaryMuscleGroup: 'cuadriceps',
  muscleGroups: ['cuadriceps', 'gluteo', 'hombro'],
};

const SENTADILLA: BreakdownExercise = {
  category: 'fuerza',
  disciplines: ['musculacion', 'crossfit'],
  primaryMuscleGroup: 'cuadriceps',
  muscleGroups: ['cuadriceps', 'gluteo', 'core'],
};

const PROPIO_SIN_DISCIPLINA: BreakdownExercise = {
  category: 'fuerza',
  disciplines: [],
  primaryMuscleGroup: 'pectoral',
  muscleGroups: ['pectoral', 'triceps'],
};

describe('withPercent — porcentajes enteros que suman 100', () => {
  const pesos = (values: number[]) =>
    withPercent(
      values.map((value) => ({ value })),
      (item) => item.value,
    ).map((item) => item.percent);

  it('tres tercios son 34, 33 y 33: el punto que falta va al primero', () => {
    expect(pesos([1, 1, 1])).toEqual([34, 33, 33]);
  });

  it('el redondeo va al de mayor resto, no al más grande', () => {
    // 2/7 = 28,57 · 2/7 = 28,57 · 3/7 = 42,86: los dos primeros tienen más resto.
    expect(pesos([2, 2, 3])).toEqual([29, 28, 43]);
  });

  it('con divisiones exactas no toca nada', () => {
    expect(pesos([2, 1, 1])).toEqual([50, 25, 25]);
  });

  it('siempre suman 100', () => {
    for (const values of [[1, 1, 1, 1, 1, 1, 1], [3, 0.5, 0.5, 1.5], [7, 11, 13], [1]]) {
      expect(
        pesos(values).reduce((sum, value) => sum + value, 0),
        values.join(','),
      ).toBe(100);
    }
  });

  it('sin nada que repartir, no hay porciones', () => {
    expect(pesos([])).toEqual([]);
  });
});

describe('trainingBreakdown — disciplinas', () => {
  it('un ejercicio cuenta entero en cada disciplina que tiene', () => {
    const { byDiscipline } = trainingBreakdown([WALL_BALL, SENTADILLA]);

    expect(byDiscipline).toEqual([
      { discipline: 'crossfit', exercises: 2, percent: 50 },
      { discipline: 'musculacion', exercises: 1, percent: 25 },
      { discipline: 'hyrox', exercises: 1, percent: 25 },
    ]);
  });

  it('los que no tienen disciplina van a "sin disciplina", al final aunque sean más', () => {
    const { byDiscipline } = trainingBreakdown([
      PROPIO_SIN_DISCIPLINA,
      PROPIO_SIN_DISCIPLINA,
      { ...WALL_BALL, disciplines: ['hyrox'] },
    ]);

    expect(byDiscipline).toEqual([
      { discipline: 'hyrox', exercises: 1, percent: 33 },
      { discipline: null, exercises: 2, percent: 67 },
    ]);
  });
});

describe('trainingBreakdown — categoría y segmento', () => {
  it('una categoría por ejercicio, de la más grande a la más chica', () => {
    const { byCategory, exercises } = trainingBreakdown([
      WALL_BALL,
      SENTADILLA,
      PROPIO_SIN_DISCIPLINA,
    ]);

    expect(exercises).toBe(3);
    expect(byCategory).toEqual([
      { category: 'fuerza', exercises: 2, percent: 67 },
      { category: 'gimnastico', exercises: 1, percent: 33 },
    ]);
  });

  it('en el empate, el orden de siempre y no el de llegada', () => {
    const { byCategory } = trainingBreakdown([WALL_BALL, SENTADILLA]);

    expect(byCategory.map((share) => share.category)).toEqual(['fuerza', 'gimnastico']);
  });

  it('el segmento sale del grupo primario: los secundarios no lo mueven', () => {
    const { bySegment } = trainingBreakdown([WALL_BALL, SENTADILLA, PROPIO_SIN_DISCIPLINA]);

    expect(bySegment).toEqual([
      { segment: 'tren_inferior', exercises: 2, percent: 67 },
      { segment: 'tren_superior', exercises: 1, percent: 33 },
    ]);
  });
});

describe('trainingBreakdown — grupos musculares', () => {
  it('el primario suma 1 y cada secundario ½', () => {
    const { byMuscleGroup } = trainingBreakdown([SENTADILLA]);

    expect(byMuscleGroup).toEqual([
      { muscleGroup: 'cuadriceps', primary: 1, secondary: 0, score: 1, percent: 50 },
      // Empatados, en el orden de siempre: core antes que glúteo.
      { muscleGroup: 'core', primary: 0, secondary: 1, score: 0.5, percent: 25 },
      { muscleGroup: 'gluteo', primary: 0, secondary: 1, score: 0.5, percent: 25 },
    ]);
  });

  it('suma los papeles de todos los ejercicios y ordena por puntaje', () => {
    const { byMuscleGroup } = trainingBreakdown([WALL_BALL, SENTADILLA, PROPIO_SIN_DISCIPLINA]);

    expect(byMuscleGroup.map((group) => [group.muscleGroup, group.score])).toEqual([
      ['cuadriceps', 2],
      ['pectoral', 1],
      ['gluteo', 1],
      ['hombro', 0.5],
      ['triceps', 0.5],
      ['core', 0.5],
    ]);
  });

  it('en el empate de puntaje, primero el que más veces es primario', () => {
    const { byMuscleGroup } = trainingBreakdown([WALL_BALL, SENTADILLA, PROPIO_SIN_DISCIPLINA]);
    const empatados = byMuscleGroup.filter((group) => group.score === 1);

    // Glúteo es secundario dos veces; pectoral, primario una: los dos suman 1.
    expect(empatados.map((group) => group.muscleGroup)).toEqual(['pectoral', 'gluteo']);
  });
});

describe('trainingBreakdown — sin ejercicios', () => {
  it('es un reparto vacío, no un error', () => {
    expect(trainingBreakdown([])).toEqual({
      exercises: 0,
      byDiscipline: [],
      byCategory: [],
      bySegment: [],
      byMuscleGroup: [],
    });
  });
});
