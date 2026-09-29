import {
  periodStartFor,
  seriesUnitFor,
  seriesValueFor,
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
 *
 * En hipertrofia cada punto es el RM estimado de la marca, en kg: es lo que se grafica y lo
 * que se resume (spec §5.1).
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

  const raw = await deps.records.series(exercise.managedExerciseId, periodStartFor(request.period));
  const series = raw.map((point) => ({
    performedAt: point.performedAt,
    value: seriesValueFor(exercise.kind, point),
  }));

  return {
    id: exercise.managedExerciseId,
    name: exercise.name,
    kind: exercise.kind,
    unit: seriesUnitFor(exercise.kind),
    period: request.period,
    series,
    summary: summarize(exercise.kind, series),
  };
}
