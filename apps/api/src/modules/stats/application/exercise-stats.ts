import {
  UNIT_BY_KIND,
  periodStartFor,
  summarize,
  type ExerciseStats,
  type StatsPeriod,
} from '@wasabi-cross/schemas';
import { AppError } from '../../../shared/errors/app-error.ts';
import type { OwnedExerciseNameLookup, StatsRecordSource } from '../domain/stats-ports.ts';

export interface ExerciseStatsDeps {
  lookup: OwnedExerciseNameLookup;
  records: StatsRecordSource;
}

export interface ExerciseStatsRequest {
  userId: string;
  managedExerciseId: string;
  period: StatsPeriod;
}

/**
 * La evolución de un ejercicio en el período pedido (F2-04, spec §5).
 *
 * El resumen sale de `summarize`, que vive en el paquete compartido: el front calcula lo
 * mismo cuando el usuario cambia de período, y las dos cuentas no se pueden separar
 * (ADR-0006).
 */
export async function exerciseStats(
  deps: ExerciseStatsDeps,
  request: ExerciseStatsRequest,
): Promise<ExerciseStats> {
  const exercise = await deps.lookup.findOwned(request.userId, request.managedExerciseId);
  if (!exercise) {
    throw new AppError('WC-STATS-404-001', {
      meta: { userId: request.userId, managedExerciseId: request.managedExerciseId },
    });
  }

  const series = await deps.records.series(
    exercise.managedExerciseId,
    periodStartFor(request.period),
  );

  return {
    id: exercise.managedExerciseId,
    name: exercise.name,
    kind: exercise.kind,
    unit: UNIT_BY_KIND[exercise.kind],
    period: request.period,
    series,
    summary: summarize(exercise.kind, series),
  };
}
