import type { StatsPeriod, TrainingActivity } from '@wasabi-cross/schemas';
import { trainingActivity } from '../domain/activity.ts';
import type { OwnedExercisesLookup, StatsRecordSource } from '../domain/stats-ports.ts';

export interface TrainingActivityDeps {
  lookup: OwnedExercisesLookup;
  records: StatsRecordSource;
  /** El reloj: "hace 60 días" depende de cuándo se pregunta. */
  now: () => Date;
}

/**
 * Constancia, récords y para retestear (F7-02, spec §5.4). Pide **todo** el historial de una
 * vez: una mejor marca nueva del período se compara con las de antes, y la última marca y los
 * ejercicios para retestear no miran el período.
 */
export async function activityFor(
  deps: TrainingActivityDeps,
  request: { userId: string; period: StatsPeriod },
): Promise<TrainingActivity> {
  const exercises = await deps.lookup.listOwned(request.userId);
  const series = await deps.records.seriesFor(
    exercises.map((exercise) => exercise.managedExerciseId),
    null,
  );

  return trainingActivity(
    exercises.map((exercise) => ({
      managedExerciseId: exercise.managedExerciseId,
      name: exercise.name,
      kind: exercise.kind,
      points: series.get(exercise.managedExerciseId) ?? [],
    })),
    request.period,
    deps.now(),
  );
}
