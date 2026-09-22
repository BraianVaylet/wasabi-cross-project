import { measureKindFor, type MeasureKind } from '@wasabi-cross/schemas';
import type { ManagedExerciseStore } from '../domain/managed-exercise-ports.ts';

/**
 * Lo que otros módulos pueden saber de un ejercicio gestionado: si es del usuario, cómo se
 * llama y qué mide. Las marcas (F1-07) lo usan para validar el valor y responder 404 a uno
 * ajeno; las estadísticas (F2-04), además, para titular la serie. Ninguno de los dos toca
 * el modelo de `exercises`.
 */
export async function findOwnedMeasure<Tx>(
  store: ManagedExerciseStore<Tx>,
  userId: string,
  managedExerciseId: string,
): Promise<{ managedExerciseId: string; name: string; kind: MeasureKind } | null> {
  const managed = await store.findManagedById(userId, managedExerciseId);
  if (!managed) {
    return null;
  }

  const exercise = await store.findExercise(managed.exerciseId);
  if (!exercise) {
    // Un ejercicio gestionado sin su definición es una base corrupta, no un caso de negocio.
    throw new Error(`Ejercicio gestionado ${managed.id} sin su ejercicio ${managed.exerciseId}`);
  }

  return {
    managedExerciseId: managed.id,
    name: exercise.name,
    kind: measureKindFor(exercise.category),
  };
}
