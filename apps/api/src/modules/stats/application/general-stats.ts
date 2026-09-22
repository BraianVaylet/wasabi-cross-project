import {
  periodStartFor,
  summarize,
  type Capacity,
  type GeneralStats,
  type MuscleGroup,
  type StatsPeriod,
} from '@wasabi-cross/schemas';
import { aggregateBy, type AggregateEntry } from '../domain/aggregate.ts';
import type { OwnedExercisesLookup, StatsRecordSource } from '../domain/stats-ports.ts';

/**
 * Cuántas marcas hacen falta para hablar de variación. Con una sola, `summarize` devuelve
 * 0%: verdad para ese ejercicio —no cambió nada—, pero mentira en un promedio, donde
 * arrastraría al grupo hacia cero sin haber medido nada.
 */
const MIN_RECORDS_FOR_CHANGE = 2;

export interface GeneralStatsDeps {
  lookup: OwnedExercisesLookup;
  records: StatsRecordSource;
}

/**
 * El resumen general (F2-05, spec §5): cómo viene cada capacidad y cada grupo muscular en
 * el período. Es lo que responde "¿el tren inferior progresa más rápido que el superior?".
 *
 * Cada ejercicio aporta su variación —un porcentaje— y no su valor: así un RM en kilos y
 * una carrera en segundos se pueden promediar sin mezclar unidades.
 */
export async function generalStats(
  deps: GeneralStatsDeps,
  request: { userId: string; period: StatsPeriod },
): Promise<GeneralStats> {
  const exercises = await deps.lookup.listOwned(request.userId);
  const series = await deps.records.seriesFor(
    exercises.map((exercise) => exercise.managedExerciseId),
    periodStartFor(request.period),
  );

  const changes = exercises.map((exercise) => {
    // `summarize` ya deja la variación con el signo correcto, también en tiempo.
    const summary = summarize(exercise.kind, series.get(exercise.managedExerciseId) ?? []);
    const measurable = summary !== null && summary.records >= MIN_RECORDS_FOR_CHANGE;

    return { exercise, changePercent: measurable ? summary.changePercent : null };
  });

  const byCapacity = aggregateBy(
    changes.map((change): AggregateEntry<Capacity> => ({
      keys: change.exercise.capacities,
      changePercent: change.changePercent,
    })),
  );

  const byMuscleGroup = aggregateBy(
    changes.map((change): AggregateEntry<MuscleGroup> => ({
      keys: change.exercise.muscleGroups,
      changePercent: change.changePercent,
    })),
  );

  return {
    period: request.period,
    byCapacity: byCapacity.groups.map((group) => ({
      capacity: group.key,
      changePercent: group.changePercent,
      exercises: group.exercises,
    })),
    byMuscleGroup: byMuscleGroup.groups.map((group) => ({
      muscleGroup: group.key,
      changePercent: group.changePercent,
      exercises: group.exercises,
    })),
    insufficient: {
      capacities: byCapacity.insufficient,
      muscleGroups: byMuscleGroup.insufficient,
    },
  };
}
