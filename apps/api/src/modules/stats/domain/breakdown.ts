import {
  bodySegmentFor,
  bodySegmentSchema,
  disciplineSchema,
  exerciseCategorySchema,
  muscleGroupSchema,
  type BodySegment,
  type Discipline,
  type ExerciseCategory,
  type MuscleGroup,
  type TrainingBreakdown,
} from '@wasabi-cross/schemas';

/*
 * "Tu entrenamiento" (F7-01, spec §5.4): cómo se reparten los ejercicios que el atleta tiene
 * cargados. Es una foto de la lista, no de las marcas: no hay período.
 */

/** Lo que hace falta de un ejercicio para repartirlo. */
export interface BreakdownExercise {
  readonly category: ExerciseCategory;
  readonly disciplines: readonly Discipline[];
  readonly primaryMuscleGroup: MuscleGroup;
  /** El primario adelante y después los secundarios (spec §5.1). */
  readonly muscleGroups: readonly MuscleGroup[];
}

/** Un secundario trabaja, pero menos que el primario: pesa la mitad (spec §5.4). */
const SECONDARY_WEIGHT = 0.5;

/**
 * Le pone a cada uno su porcentaje entero del total, y entre todos suman 100: se redondea hacia
 * abajo y los puntos que faltan van a los de mayor resto, en el empate al primero. Así tres
 * tercios son 34, 33 y 33, y no 33 tres veces. Los pesos son siempre positivos: una porción
 * vacía no se informa.
 */
export function withPercent<TItem extends object>(
  items: readonly TItem[],
  weight: (item: TItem) => number,
): (TItem & { percent: number })[] {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  const exact = items.map((item) => (weight(item) / total) * 100);
  const missing = 100 - exact.reduce((sum, value) => sum + Math.floor(value), 0);
  const bonus = new Set(
    exact
      .map((value, index) => ({ index, rest: value - Math.floor(value) }))
      .sort((a, b) => b.rest - a.rest || a.index - b.index)
      .slice(0, missing)
      .map((entry) => entry.index),
  );

  return items.map((item, index) => ({
    ...item,
    percent: Math.floor((weight(item) / total) * 100) + (bonus.has(index) ? 1 : 0),
  }));
}

/** De la porción más grande a la más chica; en el empate, en el orden de siempre del enum. */
function ranked<TKey extends string>(
  counts: ReadonlyMap<TKey, number>,
  order: readonly TKey[],
): [TKey, number][] {
  return [...counts.entries()].sort(
    ([keyA, countA], [keyB, countB]) =>
      countB - countA || order.indexOf(keyA) - order.indexOf(keyB),
  );
}

function countBy<TKey>(keys: Iterable<TKey>): Map<TKey, number> {
  const counts = new Map<TKey, number>();
  for (const key of keys) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Una distribución en la que cada ejercicio cae en una sola porción. */
function shares<TKey extends string>(
  keys: readonly TKey[],
  order: readonly TKey[],
): { key: TKey; exercises: number; percent: number }[] {
  return withPercent(
    ranked(countBy(keys), order).map(([key, exercises]) => ({ key, exercises })),
    (share) => share.exercises,
  );
}

/**
 * Las disciplinas. Un ejercicio cuenta entero en cada una que tiene —el Wall Ball suma a
 * CrossFit y a Hyrox—, así que el porcentaje es sobre las menciones. Los que no tienen ninguna
 * van a "Sin disciplina" (`null`), siempre al final.
 */
function byDiscipline(exercises: readonly BreakdownExercise[]): TrainingBreakdown['byDiscipline'] {
  const entries: [Discipline | null, number][] = ranked(
    countBy(exercises.flatMap((exercise) => exercise.disciplines)),
    disciplineSchema.options,
  );
  const without = exercises.filter((exercise) => exercise.disciplines.length === 0).length;
  if (without > 0) {
    entries.push([null, without]);
  }

  return withPercent(
    entries.map(([discipline, exercises]) => ({ discipline, exercises })),
    (share) => share.exercises,
  );
}

/**
 * Los grupos musculares: el primario suma 1 y cada secundario ½. Ordenados por puntaje; en el
 * empate, primero el que más veces es primario.
 */
function byMuscleGroup(
  exercises: readonly BreakdownExercise[],
): TrainingBreakdown['byMuscleGroup'] {
  const load = new Map<MuscleGroup, { primary: number; secondary: number }>();
  const add = (group: MuscleGroup, role: 'primary' | 'secondary'): void => {
    const current = load.get(group) ?? { primary: 0, secondary: 0 };
    load.set(group, { ...current, [role]: current[role] + 1 });
  };

  for (const exercise of exercises) {
    add(exercise.primaryMuscleGroup, 'primary');
    for (const group of exercise.muscleGroups) {
      if (group !== exercise.primaryMuscleGroup) {
        add(group, 'secondary');
      }
    }
  }

  const order = muscleGroupSchema.options;
  const groups = [...load.entries()]
    .map(([muscleGroup, { primary, secondary }]) => ({
      muscleGroup,
      primary,
      secondary,
      score: primary + secondary * SECONDARY_WEIGHT,
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.primary - a.primary ||
        order.indexOf(a.muscleGroup) - order.indexOf(b.muscleGroup),
    );
  return withPercent(groups, (group) => group.score);
}

export function trainingBreakdown(exercises: readonly BreakdownExercise[]): TrainingBreakdown {
  const segments: BodySegment[] = exercises.map((exercise) =>
    bodySegmentFor(exercise.primaryMuscleGroup),
  );

  return {
    exercises: exercises.length,
    byDiscipline: byDiscipline(exercises),
    byCategory: shares(
      exercises.map((exercise) => exercise.category),
      exerciseCategorySchema.options,
    ).map(({ key, ...share }) => ({ category: key, ...share })),
    bySegment: shares(segments, bodySegmentSchema.options).map(({ key, ...share }) => ({
      segment: key,
      ...share,
    })),
    byMuscleGroup: byMuscleGroup(exercises),
  };
}
