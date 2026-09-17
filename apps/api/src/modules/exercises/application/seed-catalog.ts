import type { Exercise } from '@wasabi-cross/schemas';
import { EXERCISE_CATALOG, type CatalogExercise } from '../domain/catalog.ts';
import type { ExerciseRepository } from '../domain/exercise-repository.ts';

export interface SeedReport {
  created: string[];
  updated: string[];
  unchanged: string[];
}

/** Campos que definen un ejercicio del catálogo. Lo demás (id, fechas) no se compara. */
function hasSameDefinition(stored: Exercise, definition: CatalogExercise): boolean {
  return (
    stored.category === definition.category &&
    stored.kind === definition.kind &&
    stored.bodySegment === definition.bodySegment &&
    sameSet(stored.capacities, definition.capacities) &&
    sameSet(stored.muscleGroups, definition.muscleGroups)
  );
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
}

/**
 * Carga el catálogo pre-cargado de ejercicios.
 *
 * Es idempotente: corre las veces que haga falta sin duplicar nada. No es un "insertar
 * si no existe" a ciegas — compara la definición guardada con la del código y sólo
 * escribe lo que cambió, así el `updatedAt` de un ejercicio no se mueve en cada deploy.
 */
export async function seedCatalog(
  repository: ExerciseRepository,
  catalog: readonly CatalogExercise[] = EXERCISE_CATALOG,
): Promise<SeedReport> {
  const report: SeedReport = { created: [], updated: [], unchanged: [] };

  for (const definition of catalog) {
    const existing = await repository.findCatalogByName(definition.name);

    if (!existing) {
      await repository.insertCatalogExercise(definition);
      report.created.push(definition.name);
      continue;
    }

    if (hasSameDefinition(existing, definition)) {
      report.unchanged.push(definition.name);
      continue;
    }

    await repository.updateCatalogExercise(existing.id, definition);
    report.updated.push(definition.name);
  }

  return report;
}
