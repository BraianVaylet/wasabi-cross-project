import type { Exercise } from '@wasabi-cross/schemas';
import type { CatalogExercise } from './catalog.ts';

/**
 * Puerto del módulo `exercises`. La capa de aplicación habla con esto y no con Mongo,
 * así el caso de uso del seed se puede probar sin base y el día que cambie el motor
 * cambia una sola implementación.
 */
export interface ExerciseRepository {
  /** Ejercicios del catálogo pre-cargado, los que no tienen dueño. */
  findCatalog: () => Promise<Exercise[]>;
  findCatalogByName: (name: string) => Promise<Exercise | null>;
  insertCatalogExercise: (exercise: CatalogExercise) => Promise<Exercise>;
  updateCatalogExercise: (id: string, exercise: CatalogExercise) => Promise<Exercise>;
}
