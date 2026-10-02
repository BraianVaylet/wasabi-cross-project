import type { TrainingBreakdown } from '@wasabi-cross/schemas';
import { trainingBreakdown } from '../domain/breakdown.ts';
import type { OwnedExercisesLookup } from '../domain/stats-ports.ts';

export interface TrainingBreakdownDeps {
  lookup: OwnedExercisesLookup;
}

/**
 * "Tu entrenamiento" (F7-01, spec §5.4): cómo se reparten los ejercicios del usuario por
 * disciplina, categoría, segmento y grupo muscular. Mira la lista, no las marcas: no tiene
 * período.
 */
export async function breakdownFor(
  deps: TrainingBreakdownDeps,
  userId: string,
): Promise<TrainingBreakdown> {
  return trainingBreakdown(await deps.lookup.listOwned(userId));
}
